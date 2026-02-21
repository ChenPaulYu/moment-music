import { cn } from "@/lib/utils";
import type { CreationMode } from "@/lib/types";
import { MODE_CONFIG } from "@/lib/constants";
import MaterialIcon from "./MaterialIcon";

interface SoundscapeCardProps {
  title: string;
  date: string;
  mode: CreationMode;
  imageUrl?: string;
  onPlay?: () => void;
}

export default function SoundscapeCard({
  title,
  date,
  mode,
  imageUrl,
  onPlay,
}: SoundscapeCardProps) {
  const modeLabel = MODE_CONFIG[mode].label.toUpperCase() + " MODE";

  return (
    <div className="group cursor-pointer" onClick={onPlay}>
      {/* Image container */}
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-surface">
        {imageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center backdrop-blur-sm">
            <MaterialIcon icon="play_arrow" filled size={28} className="text-white" />
          </div>
        </div>

        {/* Mode badge */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full",
              "bg-primary/30 text-white/80 backdrop-blur-sm"
            )}
          >
            {modeLabel}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-serif text-base text-white group-hover:text-primary transition-colors">
        {title}
      </h3>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-1.5 text-white/40 text-xs">
        <span>{date}</span>
        <div className="flex items-center gap-2">
          <MaterialIcon icon="favorite_border" size={14} />
          <MaterialIcon icon="download" size={14} />
        </div>
      </div>
    </div>
  );
}
