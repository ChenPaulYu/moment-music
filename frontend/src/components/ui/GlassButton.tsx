import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function GlassButton({
  children,
  className,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={cn(
        "glass-button rounded-lg px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white flex items-center gap-2 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
