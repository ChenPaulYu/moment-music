import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  getModeStylePrompt,
  setModeStylePrompt,
  resetModeStylePrompt,
  isModeStylePromptModified,
  type StylePromptKey,
  type CreationMode,
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
  {
    key: "audio_analysis_style",
    label: "Audio Analysis",
    icon: "hearing",
    color: "text-cyan-400",
    hint: "Optional — guide how ambient audio is described in Listen mode (leave empty for default)",
  },
  {
    key: "album_art_style",
    label: "Album Art",
    icon: "image",
    color: "text-orange-400",
    hint: "Optional — guide the style of AI-generated album cover art (leave empty for default)",
  },
];

type TabKey = "global" | CreationMode;

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "global", label: "Global", icon: "public" },
  { key: "write", label: "Write", icon: "edit_note" },
  { key: "listen", label: "Listen", icon: "hearing" },
  { key: "move", label: "Move", icon: "directions_run" },
  { key: "be", label: "Be", icon: "self_improvement" },
];

function useGlobalPrompts() {
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

  return { values, modified, handleChange, handleReset };
}

function useModePrompts(mode: CreationMode) {
  const [values, setValues] = useState<Record<StylePromptKey, string>>(() => {
    const v = {} as Record<StylePromptKey, string>;
    for (const card of CARDS) v[card.key] = getModeStylePrompt(mode, card.key);
    return v;
  });

  const [modified, setModified] = useState<Record<StylePromptKey, boolean>>(
    () => {
      const m = {} as Record<StylePromptKey, boolean>;
      for (const card of CARDS) m[card.key] = isModeStylePromptModified(mode, card.key);
      return m;
    }
  );

  const handleChange = (key: StylePromptKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setModeStylePrompt(mode, key, value);
    setModified((m) => ({ ...m, [key]: value !== "" }));
  };

  const handleReset = (key: StylePromptKey) => {
    resetModeStylePrompt(mode, key);
    setValues((v) => ({ ...v, [key]: "" }));
    setModified((m) => ({ ...m, [key]: false }));
  };

  return { values, modified, handleChange, handleReset };
}

function GlobalCards() {
  const { values, modified, handleChange, handleReset } = useGlobalPrompts();

  return (
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
  );
}

function ModeCards({ mode }: { mode: CreationMode }) {
  const { values, modified, handleChange, handleReset } = useModePrompts(mode);

  return (
    <div className="flex flex-col gap-4">
      {CARDS.map((card, i) => {
        const globalValue = getStylePrompt(card.key);
        const hasOverride = modified[card.key];

        return (
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
                    <div className="flex items-center gap-2">
                      {!hasOverride && (
                        <span className="text-[10px] font-medium text-primary/60 uppercase tracking-wider">
                          Using global
                        </span>
                      )}
                      {hasOverride && (
                        <button
                          onClick={() => handleReset(card.key)}
                          className="text-[10px] font-semibold text-[#9b92c9] hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Reset to global
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[#9b92c9] text-xs mb-3">{card.hint}</p>
                  <textarea
                    value={values[card.key]}
                    onChange={(e) => handleChange(card.key, e.target.value)}
                    rows={3}
                    placeholder={globalValue || (
                      card.key === "overall_mood"
                        ? "e.g. Melancholic and dreamy with a sense of wonder..."
                        : "Leave empty to use global default"
                    )}
                    className={cn(
                      "glass-input w-full rounded-lg px-3 py-2.5 text-sm resize-none",
                      "focus:outline-none focus:ring-1 focus:ring-primary/30",
                      !hasOverride && "text-white/40"
                    )}
                  />
                </div>
              </div>
            </div>
          </AnimateIn>
        );
      })}
    </div>
  );
}

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

export default function Prompts() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const activeTab: TabKey = tab && VALID_TABS.has(tab) ? (tab as TabKey) : "global";

  const setActiveTab = (key: TabKey) => {
    navigate(key === "global" ? "/prompts" : `/prompts/${key}`, { replace: true });
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

        {/* Tab row */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#131022] border border-[#292348]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === t.key
                  ? "bg-primary/20 text-white border border-primary/30"
                  : "text-[#9b92c9] hover:text-white hover:bg-white/5"
              )}
            >
              <MaterialIcon icon={t.icon} size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "global" ? (
          <GlobalCards />
        ) : (
          <ModeCards key={activeTab} mode={activeTab} />
        )}
      </div>
    </PageLayout>
  );
}
