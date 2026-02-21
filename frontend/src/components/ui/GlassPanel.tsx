import { cn } from "@/lib/utils";
import { type ElementType, type ComponentPropsWithoutRef } from "react";

type GlassPanelProps<T extends ElementType = "div"> = {
  as?: T;
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export default function GlassPanel<T extends ElementType = "div">({
  as,
  hover = false,
  className,
  children,
  ...rest
}: GlassPanelProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={cn(
        "glass-panel rounded-lg",
        hover && "glass-panel-hover",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
