import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import GenerationSteps from "@/components/ui/GenerationSteps";
import MaterialIcon from "@/components/ui/MaterialIcon";
import VisualizerBars from "@/components/ui/VisualizerBars";
import AnimateIn from "@/components/animation/AnimateIn";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { generateListen, getApiKeyStatus } from "@/lib/api";
import { getEngineForOutput, getAlbumArtEnabled } from "@/lib/engine";
import { getAllStylePrompts } from "@/lib/stylePrompts";
import ApiKeyDialog from "@/components/ui/ApiKeyDialog";
import { cn, formatTime } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

export default function ListenMode() {
  const navigate = useNavigate();
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const maxDuration = 10;
  const { isRecording, elapsed, audioBlob, start, stop } = useAudioCapture(maxDuration);
  const progress = Math.min(elapsed / maxDuration, 1);

  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const stepTimer = useRef<ReturnType<typeof setInterval>>();

  const STEPS = [
    "Analyzing audio",
    "Interpreting mood",
    "Generating audio",
    "Rendering final mix",
  ];

  // Cleanup step timer on unmount
  useEffect(() => () => clearInterval(stepTimer.current), []);

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

    const startTime = Date.now();
    stepTimer.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const p = 2.9 * (1 - Math.exp(-elapsed / 60));
      setCurrentStep(Math.min(Math.floor(p), 2));
    }, 1000);

    try {
      const response = await generateListen({
        audio: audioBlob,
        outputType,
        engine: getEngineForOutput(outputType),
        generate_image: getAlbumArtEnabled(),
        style_prompts: getAllStylePrompts(),
      });
      clearInterval(stepTimer.current);
      setCurrentStep(STEPS.length);
      await new Promise((r) => setTimeout(r, 500));
      navigate("/player", { state: response });
    } catch (err) {
      clearInterval(stepTimer.current);
      setCurrentStep(-1);
      setError(
        err instanceof Error ? err.message : "Generation failed. Try again."
      );
      setGenerating(false);
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

      {/* Captured audio indicator */}
      {audioBlob && !isRecording && (
        <div className="flex items-center gap-2 mb-6 text-green-400 text-sm">
          <MaterialIcon icon="check_circle" size={18} />
          <span>Audio captured ({(audioBlob.size / 1024).toFixed(1)} KB)</span>
        </div>
      )}

      {/* Output type */}
      <AnimateIn delay={300}>
        <p className="text-xs font-bold tracking-widest uppercase text-white/60 mb-3">
          Output Mode
        </p>
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
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
          <GenerationSteps steps={STEPS} currentStep={currentStep} />
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
