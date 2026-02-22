import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";
import {
  getStylePrompt,
  setStylePrompt,
  resetStylePrompt,
  getStylePromptDefault,
  isStylePromptModified,
  type StylePromptKey,
} from "@/lib/stylePrompts";

interface PromptCard {
  key: StylePromptKey;
  label: string;
  icon: string;
  color: string;
  hint: string;
}

const CARDS: PromptCard[] = [
  {
    key: "lyrics_style",
    label: "Lyrics Style",
    icon: "lyrics",
    color: "text-pink-400",
    hint: "Affects song output across all modes",
  },
  {
    key: "narration_style",
    label: "Narration Style",
    icon: "record_voice_over",
    color: "text-blue-400",
    hint: "Affects narration output across all modes",
  },
  {
    key: "bg_music_style",
    label: "Background Music",
    icon: "music_note",
    color: "text-green-400",
    hint: "Affects background music in narration output",
  },
  {
    key: "music_prompt_style",
    label: "Music Prompt Style",
    icon: "piano",
    color: "text-purple-400",
    hint: "Affects instrumental output across all modes",
  },
  {
    key: "overall_mood",
    label: "Overall Mood",
    icon: "mood",
    color: "text-amber-400",
    hint: "Optional — applies globally to all outputs (leave empty for no override)",
  },
];

export default function Prompts() {
  const [values, setValues] = useState<Record<StylePromptKey, string>>(() => {
    const v = {} as Record<StylePromptKey, string>;
    for (const card of CARDS) v[card.key] = getStylePrompt(card.key);
    return v;
  });

  const [modified, setModified] = useState<Record<StylePromptKey, boolean>>(
    () => {
      const m = {} as Record<StylePromptKey, boolean>;
      for (const card of CARDS) m[card.key] = isStylePromptModified(card.key);
      return m;
    }
  );

  const handleChange = (key: StylePromptKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setStylePrompt(key, value);
    setModified((m) => ({
      ...m,
      [key]: value !== getStylePromptDefault(key),
    }));
  };

  const handleReset = (key: StylePromptKey) => {
    resetStylePrompt(key);
    const def = getStylePromptDefault(key);
    setValues((v) => ({ ...v, [key]: def }));
    setModified((m) => ({ ...m, [key]: false }));
  };

  return (
    <PageLayout>
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <AnimateIn className="flex flex-col gap-1">
          <h1 className="text-white text-3xl font-bold tracking-tight">
            Prompts
          </h1>
          <p className="text-[#9b92c9] text-sm">
            Customize the creative style of AI-generated content
          </p>
        </AnimateIn>

        <div className="flex flex-col gap-4">
          {CARDS.map((card, i) => (
            <AnimateIn key={card.key} delay={i * 80}>
              <div className="glass-panel rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-lg bg-[#131022] border border-[#292348] flex items-center justify-center shrink-0">
                    <MaterialIcon
                      icon={card.icon}
                      size={20}
                      className={card.color}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white text-sm font-semibold">
                        {card.label}
                      </h3>
                      {modified[card.key] && (
                        <button
                          onClick={() => handleReset(card.key)}
                          className="text-[10px] font-semibold text-[#9b92c9] hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-[#9b92c9] text-xs mb-3">{card.hint}</p>
                    <textarea
                      value={values[card.key]}
                      onChange={(e) => handleChange(card.key, e.target.value)}
                      rows={3}
                      placeholder={
                        card.key === "overall_mood"
                          ? "e.g. Melancholic and dreamy with a sense of wonder..."
                          : undefined
                      }
                      className={cn(
                        "glass-input w-full rounded-lg px-3 py-2.5 text-sm resize-none",
                        "focus:outline-none focus:ring-1 focus:ring-primary/30"
                      )}
                    />
                  </div>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
