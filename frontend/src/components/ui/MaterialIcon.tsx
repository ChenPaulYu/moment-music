import { cn } from "@/lib/utils";

interface MaterialIconProps {
  icon: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function MaterialIcon({
  icon,
  filled = false,
  size = 24,
  className,
}: MaterialIconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {icon}
    </span>
  );
}
