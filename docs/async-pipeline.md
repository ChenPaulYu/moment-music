# Async Pipeline & Concurrency

How Moment Music handles long-running AI generation through an async job queue with real-time progress tracking.

## Overview

Audio generation takes 30-120+ seconds depending on the engine and output type. Rather than blocking an HTTP request, the backend uses a fire-and-forget pattern:

1. Frontend submits a generation request
2. Backend validates, creates a job, and returns `{ job_id }` immediately
3. The job runs asynchronously in a background `asyncio.Task`
4. Frontend polls for status every 2 seconds
5. On completion, the frontend navigates to the player with the result

## Job Store (`backend/app/services/jobs.py`)

The `JobStore` is an in-memory singleton that manages all generation jobs.

### Data Model

```python
@dataclass
class Job:
    id: str
    status: str       # "queued" | "running" | "completed" | "failed" | "cancelled"
    mode: str          # "be" | "write" | "listen" | "move"
    output_type: str   # "instrumental" | "song" | "narration"
    step: int          # current step index (0-based)
    steps: list[str]   # step labels, e.g. ["Interpreting mood", "Generating audio", ...]
    result: dict | None
    error: str | None
    created_at: float
    _task: asyncio.Task | None  # reference to the running coroutine
```

### Concurrency Control

```python
class JobStore:
    def __init__(self, max_concurrent=1, max_queue=3):
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._max_queue = max_queue
```

- **`max_concurrent=1`** — Only one job runs at a time. GPU-bound engines (ACE-STEP, HeartMuLa, Stable Audio Open) cannot safely share the GPU.
- **`max_queue=3`** — At most 3 jobs can be active (queued + running). The 4th request gets HTTP 503.
- **`asyncio.Semaphore`** — Queued jobs wait on the semaphore until the running job finishes. This is non-blocking; the event loop stays responsive.

### Queue Full Check

Before creating a job, every router checks:

```python
if job_store.is_queue_full():
    return JSONResponse(
        status_code=503,
        content={"error": "Server is busy. Please try again in a moment."},
    )
```

This prevents unbounded queue growth. The frontend shows the error message to the user.

### Job Lifecycle

```
Created → Queued → [waiting on semaphore] → Running → Completed / Failed
                                               ↑
                                          Cancelled (at any point before completion)
```

The `acquire()` context manager handles the semaphore and status transition:

```python
@asynccontextmanager
async def acquire(self, job_id: str):
    async with self._semaphore:      # blocks until a slot opens
        self.set_running(job_id)     # queued → running
        yield
```

### Cleanup

Completed/failed/cancelled jobs are cleaned up after 1 hour (`cleanup_old(max_age=3600)`) on every new job creation.

## Router Pattern

All four routers (Be, Write, Listen, Move) follow the same structure. Using Be mode as the example:

### 1. Validate & Create Job

```python
@router.post("/generate")
async def generate(req: GenerateRequest):
    # Validate output_type, engine availability, TTS for narration
    engine = get_engine(req.engine)
    if not engine.is_available():
        return JSONResponse(status_code=503, ...)

    if job_store.is_queue_full():
        return JSONResponse(status_code=503, ...)

    steps = _get_steps(req.output_type, generate_image=req.generate_image)
    job_id = job_store.create(mode="be", output_type=req.output_type, steps=steps)
```

### 2. Background Task

The handler dispatches the actual work to a background `asyncio.Task` and returns the job ID immediately:

```python
    async def _run():
        try:
            async with job_store.acquire(job_id):
                if job_store.is_cancelled(job_id):
                    return
                result = await _handle_instrumental(req, engine, job_id=job_id)
                if result is not None:
                    job_store.complete(job_id, result)
        except asyncio.CancelledError:
            job_store.cancel(job_id)
        except Exception as e:
            job_store.fail(job_id, str(e))

    task = asyncio.create_task(_run())
    job_store.set_task(job_id, task)
    return {"job_id": job_id}
```

Key points:
- `acquire()` waits for a semaphore slot (queued jobs wait here)
- Cancellation is checked before starting work
- The task reference is stored so `cancel()` can call `task.cancel()`
- Any exception fails the job with the error message

### 3. Step Progression

Each handler advances step indices as work progresses:

```python
async def _handle_instrumental(req, engine, job_id):
    job_store.update_step(job_id, 0)  # "Interpreting mood"

    # ... geocode, weather, LLM interpretation ...

    job_store.update_step(job_id, 1)  # "Generating audio"

    # ... engine.generate() ...

    job_store.update_step(job_id, 2)  # "Generating album art" (if enabled)

    # ... await image task ...

    job_store.update_step(job_id, 3)  # "Finalizing"
```

Steps are defined per output type:

| Output Type | Steps |
|------------|-------|
| Instrumental | Interpreting mood, Generating audio, [Album art], Finalizing |
| Song | Interpreting mood, Composing lyrics & tags, Generating song, [Album art], Finalizing |
| Narration | Interpreting mood, Writing narration, Generating voice, Generating background music, Mixing audio, [Album art], Finalizing |

### 4. Cancellation Checks

Long operations check for cancellation between steps:

```python
if job_store.is_cancelled(job_id):
    engine.unload()   # free GPU memory
    return None       # returning None skips job_store.complete()
```

When the user cancels from the UI:
1. Frontend calls `POST /api/jobs/{id}/cancel`
2. `job_store.cancel()` sets status to "cancelled" and calls `task.cancel()`
3. The running coroutine raises `asyncio.CancelledError` at the next `await`
4. The except handler in `_run()` catches it and marks the job cancelled

## Parallel Work: Album Art + Audio

Album art generation (DALL-E API call) doesn't need the GPU, so it runs in parallel with audio generation using `asyncio.create_task`:

```python
# Start album art in background (API call, doesn't need GPU)
image_task = None
if req.generate_image:
    image_task = asyncio.create_task(
        generate_album_art(summary, mood_keywords, weather_desc, style_prompts=req.style_prompts)
    )

# GPU-bound: generate audio (this is the slow part)
await engine.generate(prompt=..., duration=..., output_path=...)
engine.unload()  # free GPU immediately

# Now await the image result (usually already done by now)
img_filename = None
if image_task:
    job_store.update_step(job_id, next_step)  # "Generating album art"
    img_filename = await image_task

job_store.update_step(job_id, final_step)     # "Finalizing"
```

This pattern ensures:
- Audio generation has exclusive GPU access
- Album art generation runs concurrently (it's just an API call)
- Step progression reflects actual progress — "Generating album art" only shows after audio is done
- The GPU is unloaded before waiting for the image task

### Narration: Sequential GPU Work

Narration is more complex because it needs two GPU-bound operations sequentially:

```
TTS voice synthesis (Qwen3-TTS on GPU)
    ↓ measure voice duration
Background music generation (ACE-STEP on GPU, duration = voice length)
    ↓
FFmpeg mix voice + music
    ↓
Album art (parallel API call, started earlier)
```

Both TTS and music engines `unload()` after use to free GPU memory for the next engine.

## Frontend Polling (`frontend/src/lib/jobs.ts`, mode pages)

### Active Job Persistence

The frontend stores the active job in localStorage so it survives page refreshes:

```typescript
// On generation start
saveActiveJob(job_id, "be");

// On mount — resume polling if a job was in progress
useEffect(() => {
    const active = getActiveJob();
    if (active && active.mode === "be") {
        setJobId(active.jobId);
        setGenerating(true);
        startPolling(active.jobId);
    }
    return () => clearInterval(pollRef.current);
}, [startPolling]);
```

### Polling Loop

Every 2 seconds, the frontend fetches the job status:

```typescript
const startPolling = useCallback((jid: string) => {
    pollRef.current = setInterval(async () => {
        if (pollingRef.current) return;  // skip if previous poll in-flight
        pollingRef.current = true;
        try {
            const job = await getJobStatus(jid);
            setSteps(job.steps);
            setCurrentStep(job.step);
            setQueuePosition(job.queue_position);

            if (job.status === "completed") {
                clearInterval(pollRef.current);
                clearActiveJob();
                navigate(`/player/${jid}`, { state: job.result });
            } else if (job.status === "failed") {
                clearInterval(pollRef.current);
                clearActiveJob();
                setError(job.error || "Generation failed");
                setGenerating(false);
            } else if (job.status === "cancelled") {
                clearInterval(pollRef.current);
                clearActiveJob();
                setGenerating(false);
            }
        } catch {
            clearInterval(pollRef.current);
            clearActiveJob();
            setError("Generation session lost. Please try again.");
            setGenerating(false);
        } finally {
            pollingRef.current = false;
        }
    }, 2000);
}, [navigate]);
```

Key design decisions:
- **Guard against overlapping polls** — `pollingRef.current` prevents concurrent fetches
- **State diffing** — Steps and currentStep only update when values actually change (avoids unnecessary re-renders)
- **Queue position** — Shows "Waiting in queue (position #N)" when the job is queued behind others
- **Error recovery** — Network errors clear the job and show a retry message

### UI Progress Display

The `GenerationSteps` component renders a vertical step list with animated transitions:

```
  Interpreting mood      ✓ (completed)
  Generating audio       ⟳ (in progress, spinning)
  Generating album art     (pending)
  Finalizing               (pending)
```

## Sequence Diagram

```
User          Frontend              Backend               GPU Engine       OpenAI API
 │               │                     │                     │                │
 │  click        │                     │                     │                │
 │──────────────>│                     │                     │                │
 │               │  POST /generate     │                     │                │
 │               │────────────────────>│                     │                │
 │               │  { job_id }         │                     │                │
 │               │<────────────────────│                     │                │
 │               │                     │                     │                │
 │               │  GET /jobs/{id}     │  acquire semaphore  │                │
 │               │────────────────────>│─ ─ ─ ─ ─ ─ ─ ─ ─ >│                │
 │               │  { step: 0 }       │                     │                │
 │               │<────────────────────│  GPT-5.2 interpret  │                │
 │               │                     │─────────────────────────────────────>│
 │               │  GET /jobs/{id}     │  { mood, prompt }   │                │
 │               │────────────────────>│<─────────────────────────────────────│
 │               │  { step: 1 }       │                     │                │
 │               │<────────────────────│  engine.generate()  │                │
 │               │                     │────────────────────>│                │
 │               │  GET /jobs/{id}     │                     │   (GPU work)   │
 │               │────────────────────>│  create_task(art)   │                │
 │               │  { step: 1 }       │──────────────────────────────────────>│
 │               │<────────────────────│                     │                │
 │               │                     │  audio.mp3          │   image.png    │
 │  ...polling   │  GET /jobs/{id}     │<────────────────────│<───────────────│
 │               │────────────────────>│  unload engine      │                │
 │               │  { step: 2 }       │                     │                │
 │               │<────────────────────│  await image_task   │                │
 │               │                     │                     │                │
 │               │  GET /jobs/{id}     │  complete(result)   │                │
 │               │────────────────────>│                     │                │
 │               │  { status: done }   │                     │                │
 │               │<────────────────────│                     │                │
 │               │                     │                     │                │
 │  navigate     │                     │                     │                │
 │  to player    │                     │                     │                │
 │<──────────────│                     │                     │                │
```

## Error Handling

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Invalid engine | HTTP 400, no job created | Shows error message |
| Engine unavailable | HTTP 503, no job created | Shows error message |
| Queue full | HTTP 503 `"Server is busy"` | Shows error message |
| LLM/API failure | Job status → failed, error stored | Polls, sees failure, shows error |
| Engine crash | Exception caught, job failed | Polls, sees failure, shows error |
| User cancels | Job cancelled, task.cancel() | Stops polling, resets UI |
| Network lost | N/A | Catch in polling, shows "session lost" |
| Page refresh | Job persists in memory | Resumes polling from localStorage |

## Adding a New Router

To add a new generation mode:

1. Create `backend/app/routers/new_mode.py` following the pattern:
   - Define a `GenerateRequest` Pydantic model
   - Add queue full check before `job_store.create()`
   - Dispatch work via `asyncio.create_task(_run())`
   - Store the task with `job_store.set_task()`
   - Return `{"job_id": job_id}`

2. Write handler functions (`_handle_instrumental`, `_handle_song`, `_handle_narration`) that:
   - Call `job_store.update_step()` at each stage
   - Check `job_store.is_cancelled()` between stages
   - Call `engine.unload()` after GPU work
   - Start `generate_album_art` as a background task with `asyncio.create_task()`

3. Register in `backend/app/main.py`:
   ```python
   app.include_router(new_router, prefix="/api")
   ```

4. Add frontend API function in `frontend/src/lib/api.ts`

5. Build the mode page with the standard polling pattern (copy from `BeMode.tsx`)
