import MaterialIcon from "./MaterialIcon";
import { cn } from "@/lib/utils";

interface GenerationStepsProps {
  steps: string[];
  currentStep: number; // 0-indexed, -1 = not started
  className?: string;
}

export default function GenerationSteps({ steps, currentStep, className }: GenerationStepsProps) {
  return (
    <div className={cn("w-full max-w-md space-y-3 mt-4", className)}>
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;
        const isPending = i > currentStep;

        return (
          <div key={label} className="flex items-center gap-3">
            {/* Icon */}
            {isCompleted ? (
              <MaterialIcon
                icon="check_circle"
                size={20}
                filled
                className="text-green-400 shrink-0"
              />
            ) : isActive ? (
              <MaterialIcon
                icon="progress_activity"
                size={20}
                className="text-primary animate-spin shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
            )}

            {/* Label */}
            <span
              className={cn(
                "text-sm transition-colors duration-300",
                isCompleted && "text-green-400",
                isActive && "text-white font-medium",
                isPending && "text-white/30"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
