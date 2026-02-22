import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/animation/PageTransition";
import AnimateIn from "@/components/animation/AnimateIn";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AudioVisualizer from "@/components/ui/AudioVisualizer";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { formatTime } from "@/lib/utils";
import { saveSoundscape } from "@/lib/library";
import type { BeGenerateResponse } from "@/lib/types";

const FALLBACK_AUDIO = "/food-song.mp3";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=600&h=600&fit=crop";

function parseWeatherTitle(summary: string): { description: string; city: string } {
  // "Taipei | 21.3C | partly cloudy" → { description: "Partly Cloudy", city: "Taipei" }
  const parts = summary.split("|").map((s) => s.trim());
  if (parts.length >= 3) {
    const desc = parts[2].replace(/\b\w/g, (c) => c.toUpperCase());
    return { description: desc, city: parts[0] };
  }
  return { description: "Your Moment", city: summary };
}

export default function MomentPlayer() {
  const { jobId: _jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const rawState = location.state as (BeGenerateResponse & { fromLibrary?: boolean }) | null;
  const playerData = rawState;
  const fromLibrary = rawState?.fromLibrary === true;
  const [saved, setSaved] = useState(false);

  const audioSrc = playerData?.audio_url ?? FALLBACK_AUDIO;
  const { isPlaying, currentTime, duration, progress, play, pause, seek, setSource, audioElement } =
    useAudioPlayer();
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSource(audioSrc);
  }, [audioSrc, setSource]);

  const titleInfo = useMemo(() => {
    if (playerData?.weather_summary) {
      return parseWeatherTitle(playerData.weather_summary);
    }
    // Write/Listen mode or fallback — derive title from mood keywords
    const desc =
      playerData?.mood_keywords?.[0]
        ?.replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Your Moment";
    const cityLabel = playerData?.mode === "listen"
      ? "Listened"
      : playerData?.mode === "move"
        ? "Moved"
        : "Written";
    return { description: desc, city: cityLabel };
  }, [playerData]);

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else play();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };


  const modeButtons = [
    { icon: "directions_run", label: "Move", route: "/move" },
    { icon: "edit", label: "Write", route: "/write" },
    { icon: "graphic_eq", label: "Listen", route: "/listen" },
    { icon: "self_improvement", label: "Be", route: "/be" },
  ];

  return (
    <div className="relative flex flex-col min-h-screen">
      <AnimatedBackground />
      <Header />

      {/* Back link */}
      <div className="relative z-10 px-4 sm:px-8 pt-20 sm:pt-24">
        <Link
          to={fromLibrary ? "/library" : "/"}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
        >
          <MaterialIcon
            icon="arrow_back"
            size={18}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-xs font-medium tracking-wide uppercase">
            {fromLibrary ? "Back to Library" : "Back to Home"}
          </span>
        </Link>
      </div>

      {/* Main content */}
      <PageTransition className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 w-full max-w-4xl mx-auto text-center mt-2">
        {/* Album art + visualizer */}
        <AnimateIn className="mb-8 relative group cursor-pointer">
          <AudioVisualizer
            audioElement={audioElement}
            isPlaying={isPlaying}
            className="absolute inset-0 -m-16 z-0"
          />
          <div className="relative z-10 w-56 h-56 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src={playerData?.image_url ?? FALLBACK_IMAGE}
              alt={`${titleInfo.description} in ${titleInfo.city}`}
              className="w-full h-full object-cover"
            />
          </div>
        </AnimateIn>

        {/* Title + metadata */}
        <AnimateIn delay={100} className="space-y-3 mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-white leading-tight">
            {titleInfo.description} in{" "}
            <span className="text-gradient font-normal">{titleInfo.city}</span>
          </h1>

          {/* Mode badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-indigo-200 border border-primary/20 backdrop-blur-sm">
              <MaterialIcon icon="auto_awesome" size={14} className="mr-1" />
              {playerData?.mode === "write"
                ? "Based on your Writing"
                : playerData?.mode === "listen"
                  ? "Based on your Soundscape"
                  : playerData?.mode === "move"
                    ? "Based on your Movement"
                    : playerData
                      ? "Based on your Environment"
                      : "Demo Playback"}
            </span>
          </div>

          {/* Mood keywords */}
          {playerData?.mood_keywords && playerData.mood_keywords.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {playerData.mood_keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-white/50 border border-white/10"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {playerData?.summary && (
            <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
              {playerData.summary}
            </p>
          )}
        </AnimateIn>

        {/* Player card */}
        <AnimateIn delay={200} className="w-full max-w-2xl bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
          {/* Progress bar */}
          <div>
            <div
              ref={progressBarRef}
              className="group/progress w-full mb-6 cursor-pointer"
              onClick={handleSeek}
            >
              <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden group-hover/progress:h-2 transition-all duration-300">
                <div
                  className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_rgba(99,71,255,0.6)] rounded-full transition-[width] duration-150"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs font-medium text-white/40">
                <span>{formatTime(Math.floor(currentTime))}</span>
                <span>{formatTime(Math.floor(duration))}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center">
              <button
                onClick={handlePlayPause}
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-primary/30 cursor-pointer"
              >
                <MaterialIcon
                  icon={isPlaying ? "pause" : "play_arrow"}
                  filled
                  size={40}
                />
              </button>
            </div>
          </div>

          {/* Lyrics / Narration panel */}
          {playerData?.output_type === "song" && playerData.lyrics && (
            <>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-white/50 hover:text-white/70 transition-colors text-sm font-medium">
                  <MaterialIcon icon="lyrics" size={18} />
                  Lyrics
                  <MaterialIcon
                    icon="expand_more"
                    size={18}
                    className="ml-auto transition-transform group-open:rotate-180"
                  />
                </summary>
                <pre className="mt-3 text-white/40 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {playerData.lyrics}
                </pre>
              </details>
            </>
          )}

          {playerData?.output_type === "narration" && playerData.narration_text && (
            <>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-white/50 hover:text-white/70 transition-colors text-sm font-medium">
                  <MaterialIcon icon="record_voice_over" size={18} />
                  Narration
                  <MaterialIcon
                    icon="expand_more"
                    size={18}
                    className="ml-auto transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-white/40 text-sm leading-relaxed">
                  {playerData.narration_text}
                </p>
              </details>
            </>
          )}

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Capture next moment */}
          <div className="flex flex-col items-center gap-3 py-1">
            <h3 className="text-[10px] sm:text-xs font-light text-white/50 tracking-widest uppercase">
              Capture the next moment...
            </h3>
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              {modeButtons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => navigate(btn.route)}
                  className="group flex flex-col items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 group-hover:text-white group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                    <MaterialIcon icon={btn.icon} size={20} />
                  </div>
                  <span className="text-[10px] font-medium text-white/40 group-hover:text-white/80 transition-colors">
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </AnimateIn>
      </PageTransition>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-6 flex justify-between items-end">
        <div className="hidden sm:block text-xs text-white/30 font-mono">
          <p>ENGINE: {playerData?.engine ?? "MOMENT-V4-AUDIO"}</p>
          <p>OUTPUT: {playerData?.output_type?.toUpperCase() ?? "INSTRUMENTAL"}</p>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {playerData && !fromLibrary && (
            <button
              onClick={() => {
                if (!saved) {
                  saveSoundscape(playerData);
                  setSaved(true);
                }
              }}
              disabled={saved}
              className="flex items-center gap-3 px-5 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-xl text-white transition-all border border-white/10 group cursor-pointer disabled:opacity-60 disabled:cursor-default"
            >
              <MaterialIcon
                icon={saved ? "check_circle" : "bookmark_add"}
                size={20}
                className={saved ? "text-green-400" : "text-white/80 group-hover:-translate-y-0.5 transition-transform"}
              />
              <span className="font-medium text-sm">{saved ? "Saved" : "Save to Library"}</span>
            </button>
          )}
          <button className="flex items-center gap-3 px-5 py-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-xl text-white transition-all border border-white/10 group cursor-pointer">
            <MaterialIcon
              icon="download"
              size={20}
              className="group-hover:-translate-y-0.5 transition-transform text-white/80"
            />
            <span className="font-medium text-sm">Download</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
