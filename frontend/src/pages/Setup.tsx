import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";

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
          "Stable Audio API (Cloud)",
          "Stable Audio Open",
          "Magenta RT",
          "ACE-STEP",
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
    groups: [{ label: "Engine", options: ["ACE-STEP"] }],
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
          "Stable Audio API (Cloud)",
          "Stable Audio Open",
          "Magenta RT",
          "ACE-STEP",
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

export default function Setup() {
  const [selected, setSelected] = useState<Record<string, string>>({
    "instrumental.Engine": "Stable Audio API (Cloud)",
    "vocal.Engine": "ACE-STEP",
    "narration.Voice": "Voicebox / Qwen3-TTS (Local)",
    "narration.Background Music": "Stable Audio API (Cloud)",
  });

  const select = (key: string, value: string) =>
    setSelected((s) => ({ ...s, [key]: value }));

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
      </div>
    </PageLayout>
  );
}
