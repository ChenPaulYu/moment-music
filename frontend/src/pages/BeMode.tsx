import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import GlassPanel from "@/components/ui/GlassPanel";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";
import type { OutputType, EnvironmentData } from "@/lib/types";

export default function BeMode() {
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const [fetched, setFetched] = useState(false);
  const [envData] = useState<EnvironmentData>({
    location: "Tokyo, Japan",
    weather: "Cloudy",
    time: "Sunset",
  });

  return (
    <PageLayout>
      {/* Mode badge + title */}
      <AnimateIn delay={100}>
        <div className="flex justify-center mb-4">
          <div className="glass-panel px-4 py-1.5 rounded-full">
            <span className="text-primary text-xs font-bold tracking-widest uppercase">
              Be Mode
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-white mb-2 text-center">
          Tune into your
        </h1>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-center text-gradient mb-8 sm:mb-12">
          surroundings
        </h1>
      </AnimateIn>

      {/* Fetch environment circle */}
      <AnimateIn delay={200} className="flex justify-center">
        <button
          onClick={() => setFetched(true)}
          className={cn(
            "relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center gap-3",
            "bg-background-dark/60 border border-white/10 cursor-pointer",
            "hover:border-primary/30 transition-all duration-500",
            "mb-12",
            fetched && "border-primary/30 shadow-[0_0_40px_rgba(99,71,255,0.2)]"
          )}
        >
          <MaterialIcon
            icon="share_location"
            size={40}
            className={cn(
              "transition-colors",
              fetched ? "text-primary" : "text-white/60"
            )}
          />
          <span className="text-white font-medium text-lg">
            Fetch Environment
          </span>
          <span className="text-white/40 text-sm">Click to analyze</span>
        </button>
      </AnimateIn>

      {/* Environment data cards */}
      <AnimateIn delay={300}>
        <GlassPanel className="w-full max-w-2xl p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: "navigation", label: "LOCATION", value: envData.location, color: "text-blue-400" },
              { icon: "cloud", label: "WEATHER", value: envData.weather, color: "text-white/60" },
              { icon: "wb_twilight", label: "TIME", value: envData.time, color: "text-amber-400" },
            ].map((card) => (
              <div
                key={card.label}
                className="glass-panel rounded-lg p-4 flex flex-col items-center text-center gap-2"
              >
                <MaterialIcon
                  icon={card.icon}
                  size={28}
                  className={card.color}
                />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
                  {card.label}
                </span>
                <span className="text-white font-semibold text-sm">
                  {card.value}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </AnimateIn>

      {/* Output type + Generate */}
      <AnimateIn delay={400}>
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
        <GenerateButton className="mt-6" />
      </AnimateIn>
    </PageLayout>
  );
}
