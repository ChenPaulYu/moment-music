import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MODE_CONFIG, MODE_ORDER } from "@/lib/constants";
import MaterialIcon from "./MaterialIcon";

export default function ModeNav() {
  const { pathname } = useLocation();

  return (
    <div className="w-full max-w-4xl flex items-center justify-between mb-8">
      {/* Back to home */}
      <Link
        to="/"
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
      >
        <MaterialIcon
          icon="arrow_back"
          size={18}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="text-xs font-medium tracking-wide uppercase">
          Home
        </span>
      </Link>

      {/* Mode switcher pills */}
      <div className="flex items-center gap-1.5">
        {MODE_ORDER.map((mode) => {
          const config = MODE_CONFIG[mode];
          const isActive = pathname === config.route;
          return (
            <Link
              key={mode}
              to={config.route}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isActive
                  ? "bg-primary/20 text-white border border-primary/30"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <MaterialIcon icon={config.icon} size={14} />
              <span className="hidden sm:inline">{config.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
