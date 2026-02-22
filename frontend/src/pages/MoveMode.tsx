import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import GenerationSteps from "@/components/ui/GenerationSteps";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { useDeviceMotion } from "@/hooks/useDeviceMotion";
import { generateMove, getApiKeyStatus, getJobStatus, cancelJob } from "@/lib/api";
import { saveActiveJob, getActiveJob, clearActiveJob } from "@/lib/jobs";
import { getEngineForOutput, getAlbumArtEnabled, getCaptureDuration } from "@/lib/engine";
import { getAllStylePromptsForMode } from "@/lib/stylePrompts";
import ApiKeyDialog from "@/components/ui/ApiKeyDialog";
import { cn, formatTime } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

export default function MoveMode() {
  const navigate = useNavigate();
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const maxDuration = getCaptureDuration();
  const { isCapturing, elapsed, readings, inputSource, start, stop, toJSON } = useDeviceMotion(maxDuration);
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

  // Resume job on mount
  useEffect(() => {
    const active = getActiveJob();
    if (active && active.mode === "move") {
      setJobId(active.jobId);
      setGenerating(true);
      startPolling(active.jobId);
    }
    return () => clearInterval(pollRef.current);
  }, [startPolling]);

  const handleCaptureToggle = async () => {
    if (isCapturing) {
      stop();
    } else {
      await start();
    }
  };

  const handleGenerate = async () => {
    if (generating || readings.length === 0) return;

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
      const { job_id } = await generateMove({
        motionData: toJSON(),
        outputType,
        engine: getEngineForOutput(outputType),
        generate_image: getAlbumArtEnabled(),
        style_prompts: getAllStylePromptsForMode("move"),
      });
      setJobId(job_id);
      saveActiveJob(job_id, "move");
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
            "w-2 h-2 rounded-full animate-pulse",
            isCapturing ? "bg-green-400" : "bg-primary"
          )} />
          <span className={cn(
            "text-xs font-bold tracking-widest uppercase glass-panel px-3 py-1 rounded-full",
            isCapturing ? "text-green-400" : "text-primary"
          )}>
            {isCapturing ? `Capturing • ${readings.length} samples` : "Move Mode"}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white mb-3 text-center">
          Motion Capture
        </h1>
        <p className="text-white/50 text-sm sm:text-lg font-light text-center mb-10 sm:mb-16">
          {inputSource === "pointer"
            ? "Move your cursor to shape the sound."
            : "Move your device to shape the sound."}
        </p>
      </AnimateIn>

      {/* Progress ring + capture button */}
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
            stroke={isCapturing ? "#6347ff" : "#6347ff"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 150}`}
            strokeDashoffset={`${2 * Math.PI * 150 * (1 - progress)}`}
            className="transition-all duration-300"
          />
        </svg>

        {/* Inner circle button */}
        <button
          onClick={handleCaptureToggle}
          disabled={generating}
          className={cn(
            "relative w-48 h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center gap-3",
            "bg-background-dark/80 border border-white/10 cursor-pointer",
            "hover:border-primary/50 transition-all duration-300",
            isCapturing && "shadow-[0_0_60px_rgba(99,71,255,0.3)] border-primary/30",
            generating && "opacity-50 cursor-not-allowed"
          )}
        >
          <MaterialIcon
            icon={isCapturing ? "stop" : (inputSource === "pointer" ? "mouse" : "screen_rotation")}
            size={40}
            className={cn(
              "transition-colors",
              isCapturing ? "text-primary" : "text-white/40"
            )}
          />
          <span className="text-xs font-bold tracking-widest uppercase text-white/50">
            {isCapturing ? "Stop Capture" : "Start Capture"}
          </span>
        </button>
      </AnimateIn>

      {/* Timer */}
      <AnimateIn delay={200} className={cn(
        "glass-panel rounded-lg px-6 py-2 text-sm font-mono mb-12",
        isCapturing ? "text-primary/80" : "text-primary/80"
      )}>
        {formatTime(Math.floor(elapsed))} / {formatTime(maxDuration)}
      </AnimateIn>

      {/* Readings indicator */}
      {readings.length > 0 && !isCapturing && !generating && (
        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <MaterialIcon icon="check_circle" size={18} />
            <span>Captured {readings.length} motion samples</span>
          </div>
          {inputSource === "pointer" && (
            <span className="text-white/30 text-xs">via pointer movement</span>
          )}
        </div>
      )}

      {/* Output type + Generate */}
      <AnimateIn delay={300}>
        <OutputTypeSelector
          value={outputType}
          onChange={setOutputType}
          disabled={generating}
        />
        <GenerateButton
          icon={generating ? "progress_activity" : "auto_fix_high"}
          className="mt-8"
          disabled={readings.length === 0 || generating}
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
        {!generating && (
          <p className="text-white/30 text-xs mt-4 tracking-wider text-center">
            {readings.length === 0 ? "Capture movement to enable generation" : "Ready to generate"}
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
