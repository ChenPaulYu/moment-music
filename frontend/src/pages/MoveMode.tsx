import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import GenerationSteps from "@/components/ui/GenerationSteps";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { useDeviceMotion } from "@/hooks/useDeviceMotion";
import { generateMove, getApiKeyStatus } from "@/lib/api";
import { getEngineForOutput, getAlbumArtEnabled } from "@/lib/engine";
import { getAllStylePrompts } from "@/lib/stylePrompts";
import ApiKeyDialog from "@/components/ui/ApiKeyDialog";
import { cn } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

const STEPS = [
  "Analyzing movement",
  "Interpreting rhythm",
  "Generating audio",
  "Rendering final mix",
];

export default function MoveMode() {
  const navigate = useNavigate();
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const { isCapturing, readings, inputSource, start, stop, toJSON } = useDeviceMotion();

  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const stepTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => clearInterval(stepTimer.current), []);

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

    const startTime = Date.now();
    stepTimer.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Asymptotic progress mapped to step indices 0-2 (never reaches 3 until done)
      const p = 2.9 * (1 - Math.exp(-elapsed / 60));
      setCurrentStep(Math.min(Math.floor(p), 2));
    }, 1000);

    try {
      const response = await generateMove({
        motionData: toJSON(),
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

      {/* Concentric circles + icon */}
      <AnimateIn delay={200} className="relative flex items-center justify-center mb-12">
        {/* Outer rings */}
        <div className={cn(
          "absolute w-72 h-72 md:w-80 md:h-80 rounded-full border transition-colors duration-500",
          isCapturing ? "border-primary/20" : "border-white/5"
        )} />
        <div className={cn(
          "absolute w-56 h-56 md:w-64 md:h-64 rounded-full border transition-colors duration-500",
          isCapturing ? "border-primary/30" : "border-white/10"
        )} />

        {/* Inner circle button */}
        <button
          onClick={handleCaptureToggle}
          disabled={generating}
          className={cn(
            "relative w-44 h-44 md:w-52 md:h-52 rounded-full flex flex-col items-center justify-center gap-3",
            "bg-background-dark/60 border border-white/10 cursor-pointer",
            "hover:border-primary/40 transition-all duration-300",
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
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
        <GenerateButton
          icon={generating ? "progress_activity" : "auto_fix_high"}
          className="mt-8"
          disabled={readings.length === 0 || generating}
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
