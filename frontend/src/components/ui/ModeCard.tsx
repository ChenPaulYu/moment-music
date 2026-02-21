import MaterialIcon from "./MaterialIcon";

interface ModeCardProps {
  mode: string;
  icon: string;
  title: string;
  description: string;
  glowColor?: string;
  onClick: () => void;
}

export default function ModeCard({
  icon,
  title,
  description,
  glowColor = "from-primary",
  onClick,
}: ModeCardProps) {
  return (
    <div
      onClick={onClick}
      className="glass-panel group relative flex flex-col justify-between p-8 rounded-lg cursor-pointer h-[300px] lg:h-full overflow-hidden"
    >
      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-60" />

      {/* Hover radial glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
        <div
          className={`w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${glowColor} via-transparent to-transparent`}
        />
      </div>

      {/* Top: icon + title */}
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
          <MaterialIcon icon={icon} size={24} />
        </div>
        <h2 className="text-2xl font-light tracking-wide text-white mb-2 group-hover:translate-x-1 transition-transform duration-300">
          {title}
        </h2>
      </div>

      {/* Bottom: description + CTA */}
      <div className="relative z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
        <div className="h-[1px] w-8 bg-white/20 mb-4 group-hover:w-full group-hover:bg-primary transition-all duration-500" />
        <p className="text-white/60 font-light text-sm leading-relaxed group-hover:text-white/90 transition-colors">
          {description}
        </p>
        <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
          Enter Gateway{" "}
          <MaterialIcon icon="arrow_forward" size={14} />
        </div>
      </div>
    </div>
  );
}
