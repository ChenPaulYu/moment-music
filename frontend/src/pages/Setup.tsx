import { useState, useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";
import {
  setEngineForOutput,
  getDisplayLabel,
  getAlbumArtEnabled,
  setAlbumArtEnabled,
} from "@/lib/engine";
import { getApiKeyStatus, saveApiKeys } from "@/lib/api";
import type { OutputType } from "@/lib/types";

type SourceGroup = { label: string; options: string[] };

const ENGINES: {
  key: string;
  icon: string;
  color: string;
  label: string;
  description: string;
  groups: SourceGroup[];
}[] = [
  {
    key: "instrumental",
    icon: "piano",
    color: "text-purple-400",
    label: "Instrumental",
    description: "AI-generated background music and soundscapes",
    groups: [
      {
        label: "Engine",
        options: [
          "ACE-STEP",
          "HeartMuLa",
          "Stable Audio Open",
          "Stable Audio API (Cloud)",
        ],
      },
    ],
  },
  {
    key: "vocal",
    icon: "lyrics",
    color: "text-pink-400",
    label: "Song",
    description: "Vocals and lyrics with AI-generated music",
    groups: [{ label: "Engine", options: ["ACE-STEP", "HeartMuLa"] }],
  },
  {
    key: "narration",
    icon: "record_voice_over",
    color: "text-blue-400",
    label: "Narration",
    description: "Spoken word with background music",
    groups: [
      {
        label: "Voice",
        options: ["Voicebox / Qwen3-TTS (Local)"],
      },
      {
        label: "Background Music",
        options: [
          "ACE-STEP",
          "HeartMuLa",
          "Stable Audio Open",
          "Stable Audio API (Cloud)",
        ],
      },
    ],
  },
];

function PillSelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 1) {
    return (
      <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131022] text-[#9b92c9] border border-[#292348]">
        {options[0]}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border",
            value === opt
              ? "bg-primary/20 text-white border-primary/40"
              : "bg-[#131022] text-[#9b92c9] border-[#292348] hover:border-[#3d3566]"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const ENGINE_KEY_TO_OUTPUT: Record<string, OutputType> = {
  "instrumental.Engine": "instrumental",
  "vocal.Engine": "song",
  "narration.Background Music": "narration",
};

function getInitialSelections(): Record<string, string> {
  const defaults: Record<string, string> = {
    "instrumental.Engine": "ACE-STEP",
    "vocal.Engine": "ACE-STEP",
    "narration.Voice": "Voicebox / Qwen3-TTS (Local)",
    "narration.Background Music": "ACE-STEP",
  };
  for (const [stateKey, outputType] of Object.entries(ENGINE_KEY_TO_OUTPUT)) {
    const saved = getDisplayLabel(outputType);
    if (saved) defaults[stateKey] = saved;
  }
  return defaults;
}

export default function Setup() {
  const [selected, setSelected] = useState<Record<string, string>>(
    getInitialSelections,
  );
  const [albumArt, setAlbumArt] = useState(getAlbumArtEnabled);

  // API key management state
  const [keyStatus, setKeyStatus] = useState<{
    openai: boolean;
    stability: boolean;
    huggingface: boolean;
  }>({ openai: false, stability: false, huggingface: false });
  const [openaiKey, setOpenaiKey] = useState("");
  const [stabilityKey, setStabilityKey] = useState("");
  const [hfKey, setHfKey] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    getApiKeyStatus()
      .then(setKeyStatus)
      .catch(() => {});
  }, []);

  const select = (key: string, value: string) => {
    setSelected((s) => ({ ...s, [key]: value }));
    const outputType = ENGINE_KEY_TO_OUTPUT[key];
    if (outputType) {
      setEngineForOutput(outputType, value);
    }
  };

  return (
    <PageLayout>
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <AnimateIn className="flex flex-col gap-1">
          <h1 className="text-white text-3xl font-bold tracking-tight">
            Setup
          </h1>
          <p className="text-[#9b92c9] text-sm">
            Choose which AI engine to use for each output type.
          </p>
        </AnimateIn>

        <div className="flex flex-col gap-4">
          {ENGINES.map((engine, i) => (
            <AnimateIn key={engine.key} delay={i * 80}>
              <div className="glass-panel rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-lg bg-[#131022] border border-[#292348] flex items-center justify-center shrink-0">
                    <MaterialIcon
                      icon={engine.icon}
                      size={20}
                      className={engine.color}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white text-sm font-semibold mb-0.5">
                      {engine.label}
                    </h3>
                    <p className="text-[#9b92c9] text-xs mb-3">
                      {engine.description}
                    </p>
                    <div className="flex flex-col gap-3">
                      {engine.groups.map((group) => {
                        const stateKey = `${engine.key}.${group.label}`;
                        return (
                          <div key={stateKey}>
                            {engine.groups.length > 1 && (
                              <span className="block text-[11px] font-medium text-[#9b92c9] uppercase tracking-wider mb-1.5">
                                {group.label}
                              </span>
                            )}
                            <PillSelector
                              options={group.options}
                              value={selected[stateKey]}
                              onChange={(v) => select(stateKey, v)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>

        {/* Album art toggle */}
        <AnimateIn delay={ENGINES.length * 80}>
          <div className="glass-panel rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-[#131022] border border-[#292348] flex items-center justify-center shrink-0">
                <MaterialIcon
                  icon="image"
                  size={20}
                  className="text-amber-400"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-semibold mb-0.5">
                  Album Art
                </h3>
                <p className="text-[#9b92c9] text-xs">
                  Generate AI album cover art for each soundscape
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !albumArt;
                  setAlbumArt(next);
                  setAlbumArtEnabled(next);
                }}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer",
                  albumArt ? "bg-primary" : "bg-[#292348]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200",
                    albumArt && "translate-x-5"
                  )}
                />
              </button>
            </div>
          </div>
        </AnimateIn>

        {/* API Keys */}
        <AnimateIn delay={ENGINES.length * 80 + 80}>
          <div className="glass-panel rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-lg bg-[#131022] border border-[#292348] flex items-center justify-center shrink-0">
                <MaterialIcon icon="key" size={20} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-semibold mb-0.5">
                  API Keys
                </h3>
                <p className="text-[#9b92c9] text-xs mb-4">
                  Configure API keys for AI services
                </p>

                <div className="flex flex-col gap-3">
                  {/* OpenAI */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          keyStatus.openai ? "bg-green-400" : "bg-red-400"
                        )}
                      />
                      <span className="text-xs font-medium text-white/70">
                        OpenAI
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder={
                        keyStatus.openai ? "••••••••" : "Enter OpenAI API key"
                      }
                      value={openaiKey}
                      onChange={(e) => {
                        setOpenaiKey(e.target.value);
                        setKeySaved(false);
                      }}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Stability */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          keyStatus.stability ? "bg-green-400" : "bg-red-400"
                        )}
                      />
                      <span className="text-xs font-medium text-white/70">
                        Stability AI
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder={
                        keyStatus.stability
                          ? "••••••••"
                          : "Enter Stability AI API key"
                      }
                      value={stabilityKey}
                      onChange={(e) => {
                        setStabilityKey(e.target.value);
                        setKeySaved(false);
                      }}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Hugging Face */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          keyStatus.huggingface ? "bg-green-400" : "bg-red-400"
                        )}
                      />
                      <span className="text-xs font-medium text-white/70">
                        Hugging Face
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder={
                        keyStatus.huggingface
                          ? "••••••••"
                          : "Enter Hugging Face token"
                      }
                      value={hfKey}
                      onChange={(e) => {
                        setHfKey(e.target.value);
                        setKeySaved(false);
                      }}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    disabled={
                      keySaving || (!openaiKey && !stabilityKey && !hfKey)
                    }
                    onClick={async () => {
                      setKeySaving(true);
                      try {
                        await saveApiKeys({
                          ...(openaiKey && { openai_api_key: openaiKey }),
                          ...(stabilityKey && {
                            stability_api_key: stabilityKey,
                          }),
                          ...(hfKey && { hf_token: hfKey }),
                        });
                        setKeySaved(true);
                        setOpenaiKey("");
                        setStabilityKey("");
                        setHfKey("");
                        const status = await getApiKeyStatus();
                        setKeyStatus(status);
                      } catch {
                        // silently fail
                      } finally {
                        setKeySaving(false);
                      }
                    }}
                    className={cn(
                      "self-end px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      !openaiKey && !stabilityKey && !hfKey
                        ? "bg-[#131022] text-[#9b92c9]/50 cursor-not-allowed"
                        : "bg-primary/20 text-white border border-primary/40 hover:bg-primary/30 cursor-pointer"
                    )}
                  >
                    {keySaving
                      ? "Saving..."
                      : keySaved
                        ? "Saved!"
                        : "Save Keys"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </PageLayout>
  );
}
