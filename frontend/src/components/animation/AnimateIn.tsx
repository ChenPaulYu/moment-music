import { cn } from "@/lib/utils";

interface AnimateInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}

export default function AnimateIn({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: AnimateInProps) {
  return (
    <Tag
      className={cn("animate-fade-in-up", className)}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
