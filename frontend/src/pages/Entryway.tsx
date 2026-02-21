import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import ModeCard from "@/components/ui/ModeCard";
import AnimateIn from "@/components/animation/AnimateIn";
import { MODE_CONFIG, MODE_ORDER } from "@/lib/constants";

export default function Entryway() {
  const navigate = useNavigate();

  return (
    <PageLayout
      footerProps={{ statusMessage: "v2.4.0 • The Portal" }}
    >
      {/* Hero */}
      <AnimateIn className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-light tracking-tight text-white mb-4">
          Capture the{" "}
          <span className="italic font-normal text-primary">Moment</span>
        </h1>
        <p className="text-white/40 text-lg font-light tracking-wide max-w-lg mx-auto">
          Select a gateway to begin your sonic journey
        </p>
      </AnimateIn>

      {/* Mode cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-[1400px] lg:h-[500px]">
        {MODE_ORDER.map((mode, i) => {
          const config = MODE_CONFIG[mode];
          return (
            <AnimateIn key={mode} delay={100 + i * 100}>
              <ModeCard
                mode={mode}
                icon={config.icon}
                title={config.label}
                description={config.description}
                glowColor={config.color}
                onClick={() => navigate(config.route)}
              />
            </AnimateIn>
          );
        })}
      </div>
    </PageLayout>
  );
}
