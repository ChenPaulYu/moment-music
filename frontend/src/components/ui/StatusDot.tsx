import { cn } from "@/lib/utils";

interface StatusDotProps {
  color?: string;
  animate?: boolean;
  size?: "sm" | "md";
}

export default function StatusDot({
  color = "bg-green-500",
  animate = true,
  size = "sm",
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "rounded-full inline-block",
        color,
        size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
        animate && "animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"
      )}
    />
  );
}
