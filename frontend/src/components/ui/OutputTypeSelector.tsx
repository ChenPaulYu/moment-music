import { cn } from "@/lib/utils";
import type { OutputType } from "@/lib/types";

interface OutputTypeSelectorProps {
  value: OutputType;
  onChange: (value: OutputType) => void;
  className?: string;
}

const options: { value: OutputType; label: string }[] = [
  { value: "instrumental", label: "Instrumental" },
  { value: "song", label: "Song" },
  { value: "narration", label: "Narration" },
];

export default function OutputTypeSelector({
  value,
  onChange,
  className,
}: OutputTypeSelectorProps) {
  return (
    <div className={cn("glass-panel rounded-lg p-1 flex w-full max-w-md", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-2.5 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer",
            value === opt.value
              ? "bg-primary text-white shadow-lg"
              : "text-white/50 hover:text-white/80"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
