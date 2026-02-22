import { cn } from "@/lib/utils";
import MaterialIcon from "./MaterialIcon";

interface GenerateButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  label?: string;
  className?: string;
}

export default function GenerateButton({
  onClick,
  disabled = false,
  loading = false,
  icon = "auto_awesome",
  label = "Generate Soundscape",
  className,
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full max-w-md py-4 px-8 rounded-lg bg-primary text-white font-semibold text-base",
        "flex items-center justify-center gap-3",
        "hover:brightness-110 active:scale-[0.98] transition-all duration-200",
        "shadow-[0_0_30px_rgba(99,71,255,0.4)]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100",
        "cursor-pointer",
        className
      )}
    >
      <MaterialIcon icon={icon} size={20} className={loading ? "animate-spin" : ""} />
      {label}
    </button>
  );
}
