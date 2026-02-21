import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import SoundscapeCard from "@/components/ui/SoundscapeCard";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";
import type { Soundscape } from "@/lib/types";

const MOCK_SOUNDSCAPES: Soundscape[] = [
  {
    id: "1",
    title: "Rainy Afternoon in Taipei",
    mode: "write",
    outputType: "instrumental",
    date: "Oct 15, 2025",
    imageUrl: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Forest Run at Dawn",
    mode: "move",
    outputType: "instrumental",
    date: "Oct 12, 2025",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Neon City Reflections",
    mode: "listen",
    outputType: "song",
    date: "Oct 10, 2025",
    imageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    title: "Quiet Mountain Mist",
    mode: "be",
    outputType: "narration",
    date: "Oct 8, 2025",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    title: "Golden Hour Solitude",
    mode: "be",
    outputType: "instrumental",
    date: "Oct 6, 2025",
    imageUrl: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400&h=400&fit=crop",
  },
  {
    id: "6",
    title: "Digital Silence",
    mode: "listen",
    outputType: "instrumental",
    date: "Oct 3, 2025",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
  },
];

const SORT_OPTIONS = ["Recent", "Mood", "Atmospheric"] as const;

export default function Library() {
  const [sortBy, setSortBy] = useState<string>("Recent");
  const navigate = useNavigate();

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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-[1400px]">
        {MOCK_SOUNDSCAPES.map((s, i) => (
          <AnimateIn key={s.id} delay={100 + i * 50}>
            <SoundscapeCard
              title={s.title}
              date={s.date}
              mode={s.mode}
              imageUrl={s.imageUrl}
              onPlay={() => navigate("/player", { state: { soundscape: s } })}
            />
          </AnimateIn>
        ))}
      </div>

      {/* Pagination */}
      <AnimateIn delay={400} className="flex items-center gap-2 mt-12">
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            className={cn(
              "w-10 h-10 rounded-full text-xs font-medium transition-all cursor-pointer",
              page === 1
                ? "bg-primary text-white"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            )}
          >
            {page}
          </button>
        ))}
      </AnimateIn>
    </PageLayout>
  );
}
