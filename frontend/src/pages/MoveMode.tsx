import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { useDeviceMotion } from "@/hooks/useDeviceMotion";
import { cn } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

export default function MoveMode() {
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const { isCapturing, readings, start, stop } = useDeviceMotion();

  const handleCaptureToggle = () => {
    if (isCapturing) {
      stop();
    } else {
      start();
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
          Move your device to shape the sound.
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
          className={cn(
            "relative w-44 h-44 md:w-52 md:h-52 rounded-full flex flex-col items-center justify-center gap-3",
            "bg-background-dark/60 border border-white/10 cursor-pointer",
            "hover:border-primary/40 transition-all duration-300",
            isCapturing && "shadow-[0_0_60px_rgba(99,71,255,0.3)] border-primary/30"
          )}
        >
          <MaterialIcon
            icon={isCapturing ? "stop" : "screen_rotation"}
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
      {readings.length > 0 && !isCapturing && (
        <div className="flex items-center gap-2 mb-6 text-green-400 text-sm">
          <MaterialIcon icon="check_circle" size={18} />
          <span>Captured {readings.length} motion samples</span>
        </div>
      )}

      {/* Output type + Generate */}
      <AnimateIn delay={300}>
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
        <GenerateButton
          icon="auto_fix_high"
          className="mt-8"
          disabled={readings.length === 0}
        />
        <p className="text-white/30 text-xs mt-4 tracking-wider text-center">
          {readings.length === 0 ? "Capture movement to enable generation" : "Ready to generate"}
        </p>
      </AnimateIn>
    </PageLayout>
  );
}
