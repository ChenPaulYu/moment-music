import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="16" r="14" stroke="#6347ff" strokeWidth="2" />
        <path
          d="M12 10v12l4-3v-6l-4-3z"
          fill="#6347ff"
        />
        <path
          d="M18 12v8"
          stroke="#6347ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M21 14v4"
          stroke="#6347ff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-white font-bold tracking-widest text-sm uppercase">
        MomentMusic
      </span>
    </div>
  );
}
