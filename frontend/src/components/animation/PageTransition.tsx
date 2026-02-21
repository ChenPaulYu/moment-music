import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      ref={ref}
      className={cn("animate-page-enter", className)}
    >
      {children}
    </div>
  );
}
