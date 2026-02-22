import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import GenerationSteps from "@/components/ui/GenerationSteps";
import MaterialIcon from "@/components/ui/MaterialIcon";
import VisualizerBars from "@/components/ui/VisualizerBars";
import AnimateIn from "@/components/animation/AnimateIn";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { generateListen, getApiKeyStatus, getJobStatus, cancelJob } from "@/lib/api";
import { saveActiveJob, getActiveJob, clearActiveJob } from "@/lib/jobs";
import { getEngineForOutput, getAlbumArtEnabled, getCaptureDuration } from "@/lib/engine";
import { getAllStylePromptsForMode } from "@/lib/stylePrompts";
import ApiKeyDialog from "@/components/ui/ApiKeyDialog";
import { cn, formatTime } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

export default function ListenMode() {
  const navigate = useNavigate();
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const maxDuration = getCaptureDuration();
  const { isRecording, elapsed, audioBlob, start, stop } = useAudioCapture(maxDuration);
  const progress = Math.min(elapsed / maxDuration, 1);

  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState<string[]>([]);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const [error, setError] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  // Audio preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const pollingRef = useRef(false);
  const startPolling = useCallback((jid: string) => {
    pollRef.current = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const job = await getJobStatus(jid);
        setSteps((prev) =>
          prev.length === job.steps.length && prev.every((s, i) => s === job.steps[i])
            ? prev
            : job.steps
        );
        setCurrentStep((prev) => (prev === job.step ? prev : job.step));
        setQueuePosition((prev) => (prev === job.queue_position ? prev : job.queue_position));

        if (job.status === "completed") {
          clearInterval(pollRef.current);
          clearActiveJob();
          setCurrentStep(job.steps.length);
          await new Promise((r) => setTimeout(r, 500));
          navigate(`/player/${jid}`, { state: job.result });
        } else if (job.status === "failed") {
          clearInterval(pollRef.current);
          clearActiveJob();
          setError(job.error || "Generation failed");
          setGenerating(false);
          setJobId(null);
        } else if (job.status === "cancelled") {
          clearInterval(pollRef.current);
          clearActiveJob();
          setGenerating(false);
          setJobId(null);
        }
      } catch {
        clearInterval(pollRef.current);
        clearActiveJob();
        setGenerating(false);
        setJobId(null);
        setError("Generation session lost. Please try again.");
      } finally {
        pollingRef.current = false;
      }
    }, 2000);
  }, [navigate]);

  // Create/revoke object URL for audio preview
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setIsPlaying(false);
      setPlaybackProgress(0);
      setPlaybackTime(0);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioBlob]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setPlaybackTime(audio.currentTime);
    setPlaybackProgress((audio.currentTime / audio.duration) * 100);
  };

  // Resume job on mount
  useEffect(() => {
    const active = getActiveJob();
    if (active && active.mode === "listen") {
      setJobId(active.jobId);
      setGenerating(true);
      startPolling(active.jobId);
    }
    return () => clearInterval(pollRef.current);
  }, [startPolling]);

  const handleMicClick = async () => {
    if (isRecording) {
      stop();
    } else {
      await start();
    }
  };

  const handleGenerate = async () => {
    if (generating || !audioBlob) return;

    try {
      const status = await getApiKeyStatus();
      const missing: string[] = [];
      if (!status.openai) missing.push("openai");
      const engine = getEngineForOutput(outputType);
      if (engine.includes("stable_audio_api") && !status.stability)
        missing.push("stability");
      if (missing.length > 0) {
        setMissingKeys(missing);
        setShowKeyDialog(true);
        return;
      }
    } catch {
      // continue
    }

    setGenerating(true);
    setCurrentStep(0);
    setError(null);

    try {
      const { job_id } = await generateListen({
        audio: audioBlob,
        outputType,
        engine: getEngineForOutput(outputType),
        generate_image: getAlbumArtEnabled(),
        style_prompts: getAllStylePromptsForMode("listen"),
      });
      setJobId(job_id);
      saveActiveJob(job_id, "listen");
      startPolling(job_id);
    } catch (err) {
      setCurrentStep(-1);
      setError(
        err instanceof Error ? err.message : "Generation failed. Try again."
      );
      setGenerating(false);
    }
  };

  const handleCancel = async () => {
    if (jobId) {
      await cancelJob(jobId);
      clearInterval(pollRef.current);
      clearActiveJob();
      setGenerating(false);
      setCurrentStep(-1);
      setJobId(null);
    }
  };

  return (
    <PageLayout>
      {/* Mode badge + title */}
      <AnimateIn delay={100}>
        <div className="flex items-center gap-2 mb-4 justify-center">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isRecording ? "bg-red-500 animate-pulse" : "bg-primary animate-pulse"
          )} />
          <span className={cn(
            "text-xs font-bold tracking-widest uppercase",
            isRecording ? "text-red-400" : "text-primary"
          )}>
            {isRecording ? "Recording..." : "Listen Mode"}
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-3 text-center">
          Ambient Capture
        </h1>
        <p className="text-white/50 text-sm sm:text-lg font-light text-center mb-10 sm:mb-16">
          Capture 6-10 seconds of your surroundings to generate a unique soundscape.
        </p>
      </AnimateIn>

      {/* Mic circle */}
      <AnimateIn delay={200} className="relative flex items-center justify-center mb-8 w-64 h-64 md:w-80 md:h-80">
        {/* SVG progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 320 320">
          <circle
            cx="160"
            cy="160"
            r="150"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="2"
          />
          <circle
            cx="160"
            cy="160"
            r="150"
            fill="none"
            stroke={isRecording ? "#ef4444" : "#6347ff"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 150}`}
            strokeDashoffset={`${2 * Math.PI * 150 * (1 - progress)}`}
            className="transition-all duration-300"
          />
        </svg>

        {/* Inner dark circle */}
        <button
          onClick={handleMicClick}
          className={cn(
            "relative w-48 h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center",
            "bg-background-dark/80 border border-white/10 cursor-pointer",
            "hover:border-primary/50 transition-all duration-300",
            isRecording && "shadow-[0_0_40px_rgba(239,68,68,0.3)] border-red-500/30"
          )}
        >
          <VisualizerBars active={isRecording} className="mb-3" />
          <MaterialIcon
            icon={isRecording ? "stop" : "mic"}
            size={32}
            filled={isRecording}
            className={cn(
              "transition-colors",
              isRecording ? "text-red-400" : "text-white/60"
            )}
          />
          <span className="text-[10px] font-bold tracking-widest uppercase text-white/40 mt-2">
            {isRecording ? "Tap to stop" : audioBlob ? "Tap to re-record" : "Tap to record"}
          </span>
        </button>
      </AnimateIn>

      {/* Timer */}
      <AnimateIn delay={200} className={cn(
        "glass-panel rounded-lg px-6 py-2 text-sm font-mono mb-12",
        isRecording ? "text-red-400/80" : "text-primary/80"
      )}>
        {formatTime(Math.floor(elapsed))} / {formatTime(maxDuration)}
      </AnimateIn>

      {/* Captured audio indicator + preview */}
      {audioBlob && !isRecording && (
        <div className="flex flex-col items-center gap-3 mb-6 w-full max-w-md">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <MaterialIcon icon="check_circle" size={18} />
            <span>Audio captured ({(audioBlob.size / 1024).toFixed(1)} KB)</span>
          </div>

          {audioUrl && (
            <div className="glass-panel rounded-xl p-4 w-full">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-colors cursor-pointer shrink-0"
                >
                  <MaterialIcon
                    icon={isPlaying ? "pause" : "play_arrow"}
                    size={20}
                    className="text-white"
                  />
                </button>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); setPlaybackTime(0); }}
                  onTimeUpdate={handleTimeUpdate}
                />
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-150"
                    style={{ width: `${playbackProgress}%` }}
                  />
                </div>
                <span className="text-white/40 text-xs font-mono shrink-0">
                  {formatTime(Math.floor(playbackTime))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Output type */}
      <AnimateIn delay={300}>
        <p className="text-xs font-bold tracking-widest uppercase text-white/60 mb-3">
          Output Mode
        </p>
        <OutputTypeSelector
          value={outputType}
          onChange={setOutputType}
          disabled={generating}
        />
      </AnimateIn>

      {/* Generate */}
      <AnimateIn delay={300}>
        <GenerateButton
          icon={generating ? "progress_activity" : "equalizer"}
          className="mt-8"
          disabled={!audioBlob || generating}
          onClick={handleGenerate}
          loading={generating}
          label={generating ? "Generating..." : "Generate Soundscape"}
        />
        {generating && (
          <>
            {queuePosition > 0 && (
              <p className="text-white/50 text-sm mt-4 text-center">
                Waiting in queue (position #{queuePosition})...
              </p>
            )}
            {queuePosition === 0 && steps.length > 0 && (
              <GenerationSteps steps={steps} currentStep={currentStep} />
            )}
            <div className="flex justify-center">
              <button
                onClick={handleCancel}
                className="mt-3 text-sm text-white/40 hover:text-red-400 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="mt-4 text-red-400 text-sm text-center max-w-md">
            {error}
          </p>
        )}
      </AnimateIn>

      {showKeyDialog && (
        <ApiKeyDialog
          missingKeys={missingKeys}
          onClose={() => setShowKeyDialog(false)}
          onSaved={() => {
            setShowKeyDialog(false);
            handleGenerate();
          }}
        />
      )}
    </PageLayout>
  );
}
