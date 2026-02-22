import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import StatusDot from "@/components/ui/StatusDot";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { MODE_CONFIG, MODE_ORDER } from "@/lib/constants";

export default function Header() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const topNav = [
    { label: "Home", to: "/", icon: "home" },
    ...MODE_ORDER.map((mode) => ({
      label: MODE_CONFIG[mode].label,
      to: MODE_CONFIG[mode].route,
      icon: MODE_CONFIG[mode].icon,
    })),
  ];

  const dropdownItems = [
    { label: "Library", to: "/library", icon: "library_music" },
    { label: "Prompts", to: "/prompts", icon: "edit_note" },
    { label: "Setup", to: "/setup", icon: "settings" },
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="w-full h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between z-40 fixed top-0 left-0 glass-nav">
      <Link to="/">
        <Logo />
      </Link>

      {/* Center nav: Home + 4 modes (desktop) */}
      <nav className="hidden md:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2">
        {topNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all",
              pathname === item.to
                ? "bg-primary/20 text-white border border-primary/30"
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <MaterialIcon icon={item.icon} size={15} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-white/50 border border-white/10 px-3 py-1.5 rounded-full bg-white/5">
          <StatusDot />
          System Online
        </div>

        {/* Avatar + dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              "size-9 rounded-full bg-primary/30 ring-1 ring-white/20 flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-all",
              menuOpen && "ring-primary/50 bg-primary/40"
            )}
          >
            <MaterialIcon icon="menu" size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-3 w-52 glass-panel rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40 animate-fade-in-up">
              {/* Mode nav (mobile only) */}
              <nav className="md:hidden py-1.5 border-b border-white/5">
                {topNav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      pathname === item.to
                        ? "text-white bg-white/5"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <MaterialIcon icon={item.icon} size={18} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Secondary nav */}
              <nav className="py-1.5">
                {dropdownItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      pathname === item.to
                        ? "text-white bg-white/5"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <MaterialIcon icon={item.icon} size={18} />
                    {item.label}
                  </Link>
                ))}
              </nav>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
