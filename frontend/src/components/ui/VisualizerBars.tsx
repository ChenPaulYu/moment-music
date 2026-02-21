import { cn } from "@/lib/utils";

interface VisualizerBarsProps {
  count?: number;
  active?: boolean;
  color?: string;
  className?: string;
}

export default function VisualizerBars({
  count = 9,
  active = false,
  color = "bg-primary",
  className,
}: VisualizerBarsProps) {
  return (
    <div
      className={cn("flex items-end justify-center gap-1", className)}
    >
      {Array.from({ length: count }).map((_, i) => {
        const heights = [12, 20, 16, 28, 24, 32, 20, 26, 14];
        const h = heights[i % heights.length];
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-300",
              color,
              active ? "animate-wave" : "opacity-40"
            )}
            style={{
              height: active ? h : h * 0.4,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        );
      })}
    </div>
  );
}
