import asyncio
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from uuid import uuid4


@dataclass
class Job:
    id: str
    status: str  # "queued" | "running" | "completed" | "failed" | "cancelled"
    mode: str
    output_type: str
    step: int = 0
    steps: list[str] = field(default_factory=list)
    result: dict | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)
    _task: asyncio.Task | None = field(default=None, repr=False)


class JobStore:
    def __init__(self, max_concurrent: int = 1, max_queue: int = 3):
        self._jobs: dict[str, Job] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._max_queue = max_queue

    def is_queue_full(self) -> bool:
        """Return True if active (queued + running) jobs >= max_queue."""
        active = sum(1 for j in self._jobs.values() if j.status in ("queued", "running"))
        return active >= self._max_queue

    def create(self, mode: str, output_type: str, steps: list[str]) -> str:
        self.cleanup_old()
        job_id = uuid4().hex[:16]
        self._jobs[job_id] = Job(
            id=job_id,
            status="queued",
            mode=mode,
            output_type=output_type,
            steps=steps,
        )
        return job_id

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def update_step(self, job_id: str, step: int) -> None:
        job = self._jobs.get(job_id)
        if job:
            job.step = step

    def set_running(self, job_id: str) -> None:
        job = self._jobs.get(job_id)
        if job and job.status == "queued":
            job.status = "running"

    def complete(self, job_id: str, result: dict) -> None:
        job = self._jobs.get(job_id)
        if job:
            job.status = "completed"
            job.result = result

    def fail(self, job_id: str, error: str) -> None:
        job = self._jobs.get(job_id)
        if job and job.status not in ("completed", "cancelled"):
            job.status = "failed"
            job.error = error

    def cancel(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job or job.status in ("completed", "failed", "cancelled"):
            return False
        job.status = "cancelled"
        if job._task and not job._task.done():
            job._task.cancel()
        return True

    def is_cancelled(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        return job is not None and job.status == "cancelled"

    def set_task(self, job_id: str, task: asyncio.Task) -> None:
        job = self._jobs.get(job_id)
        if job:
            job._task = task

    def queue_position(self, job_id: str) -> int:
        job = self._jobs.get(job_id)
        if not job or job.status != "queued":
            return 0
        # Count queued/running jobs created before this one
        position = 0
        for other in self._jobs.values():
            if other.id == job_id:
                continue
            if other.status in ("queued", "running") and other.created_at <= job.created_at:
                position += 1
        return position

    def cleanup_old(self, max_age: float = 3600) -> None:
        now = time.time()
        stale = [
            jid for jid, job in self._jobs.items()
            if now - job.created_at > max_age and job.status in ("completed", "failed", "cancelled")
        ]
        for jid in stale:
            del self._jobs[jid]

    @asynccontextmanager
    async def acquire(self, job_id: str):
        """Acquire the generation semaphore. Transitions job queued -> running."""
        async with self._semaphore:
            self.set_running(job_id)
            yield


job_store = JobStore()
