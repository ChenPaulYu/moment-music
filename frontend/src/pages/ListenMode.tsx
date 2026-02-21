import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import MaterialIcon from "@/components/ui/MaterialIcon";
import VisualizerBars from "@/components/ui/VisualizerBars";
import AnimateIn from "@/components/animation/AnimateIn";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { cn, formatTime } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

export default function ListenMode() {
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const maxDuration = 10;
  const { isRecording, elapsed, audioBlob, start, stop } = useAudioCapture(maxDuration);
  const progress = Math.min(elapsed / maxDuration, 1);

  const handleMicClick = async () => {
    if (isRecording) {
      stop();
    } else {
      await start();
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
      <AnimateIn delay={200} className="relative flex items-center justify-center mb-8">
        {/* SVG progress ring */}
        <svg className="absolute w-64 h-64 md:w-80 md:h-80 -rotate-90" viewBox="0 0 320 320">
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
        <GenerateButton icon="equalizer" className="mt-8" disabled={!audioBlob} />
      </AnimateIn>
    </PageLayout>
  );
}
