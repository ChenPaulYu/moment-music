import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import SoundscapeCard from "@/components/ui/SoundscapeCard";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";
import { getSoundscapes } from "@/lib/library";
import type { Soundscape, BeGenerateResponse } from "@/lib/types";

const SORT_OPTIONS = ["Recent", "Mood", "Atmospheric"] as const;

export default function Library() {
  const [sortBy, setSortBy] = useState<string>("Recent");
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setSoundscapes(getSoundscapes());
  }, []);

  const handlePlay = (s: Soundscape) => {
    // Convert Soundscape back to BeGenerateResponse shape for the player
    const playerState: BeGenerateResponse = {
      mode: s.mode,
      output_type: s.outputType,
      summary: s.summary ?? s.title,
      mood_keywords: s.mood_keywords ?? [],
      audio_url: s.audioUrl ?? "",
      image_url: s.imageUrl,
      engine: s.engine ?? "unknown",
      lyrics: s.lyrics,
      narration_text: s.narration_text,
    };
    navigate("/player", { state: { ...playerState, fromLibrary: true } });
  };

  return (
    <PageLayout>
      {/* Title section */}
      <AnimateIn className="w-full max-w-[1400px] mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Saved Soundscapes
        </h1>
        <p className="text-white/40 text-sm">
          Your collection of generative moments
        </p>

        {/* Sort bar */}
        <div className="flex items-center gap-4 mt-6">
          <span className="text-white/30 text-xs uppercase tracking-widest">
            Sort by
          </span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={cn(
                "text-xs tracking-wider uppercase px-3 py-1 rounded-full transition-all cursor-pointer",
                sortBy === opt
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </AnimateIn>

      {/* Grid or empty state */}
      {soundscapes.length === 0 ? (
        <AnimateIn className="flex flex-col items-center gap-6 py-20">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <MaterialIcon icon="library_music" size={36} className="text-white/20" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-white/50 text-lg">No saved soundscapes yet</p>
            <p className="text-white/30 text-sm">
              Generate a moment and save it to build your library.
            </p>
          </div>
          <button
            onClick={() => navigate("/write")}
            className="mt-2 px-6 py-3 bg-primary text-white rounded-lg font-medium text-sm hover:brightness-110 transition-all cursor-pointer"
          >
            Create Your First Moment
          </button>
        </AnimateIn>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-[1400px]">
          {soundscapes.map((s, i) => (
            <AnimateIn key={s.id} delay={100 + i * 50}>
              <SoundscapeCard
                title={s.title}
                date={s.date}
                mode={s.mode}
                imageUrl={s.imageUrl}
                onPlay={() => handlePlay(s)}
              />
            </AnimateIn>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
