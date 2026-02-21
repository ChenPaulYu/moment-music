import { cn } from "@/lib/utils";

interface GlassInputProps {
  as?: "input" | "textarea";
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  maxLength?: number;
  showCharCount?: boolean;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export default function GlassInput({
  as = "textarea",
  value,
  onChange,
  maxLength = 500,
  showCharCount = true,
  placeholder,
  className,
  rows = 6,
}: GlassInputProps) {
  const Component = as;

  return (
    <div className="relative w-full">
      <Component
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={as === "textarea" ? rows : undefined}
        className={cn(
          "glass-input w-full rounded-lg px-5 py-4 text-sm text-white/90 placeholder:text-white/30 resize-none",
          className
        )}
      />
      {showCharCount && (
        <span className="absolute bottom-3 right-4 text-xs text-white/30">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
