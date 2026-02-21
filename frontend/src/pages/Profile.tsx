import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors cursor-pointer",
        checked ? "bg-primary" : "bg-[#292348]"
      )}
    >
      <div
        className={cn(
          "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-transform",
          checked ? "translate-x-4" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

function Select({
  options,
  label,
}: {
  options: string[];
  label: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#9b92c9] mb-1.5">
        {label}
      </label>
      <select className="w-full bg-[#131022] border border-[#292348] text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 appearance-none cursor-pointer">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export default function Profile() {
  const [toggles, setToggles] = useState({
    realtime: false,
    llm: true,
    instrumental: true,
    vocal: true,
    narration: false,
  });

  const toggle = (key: keyof typeof toggles) =>
    setToggles((t) => ({ ...t, [key]: !t[key] }));

  return (
    <PageLayout showFooter={false}>
      {/* Title */}
      <AnimateIn className="w-full max-w-[1200px] flex flex-col gap-2 mb-8">
        <h1 className="text-white text-3xl font-bold tracking-tight">
          Account Settings
        </h1>
        <p className="text-[#9b92c9] text-sm md:text-base">
          Manage your personal details, AI model preferences, and system status.
        </p>
      </AnimateIn>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-[1200px]">
        {/* Left: Profile Card */}
        <AnimateIn delay={100} as="section" className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/20 to-transparent" />
            <div className="relative mt-4 mb-4">
              <div className="size-28 rounded-full border-4 border-[#1e1933] bg-primary/20 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                AR
              </div>
              <button className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-2 shadow-lg transition-transform hover:scale-105 flex items-center justify-center cursor-pointer">
                <MaterialIcon icon="edit" size={18} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Alex Rivera</h2>
            <p className="text-[#9b92c9] text-sm mb-6">@arivera_music</p>

            <div className="w-full space-y-4">
              <div className="text-left">
                <label className="text-xs font-semibold text-[#9b92c9] uppercase tracking-wider mb-1 block">
                  Email Address
                </label>
                <div className="flex items-center justify-between bg-[#131022]/50 rounded-lg px-3 py-2 border border-[#292348]">
                  <span className="text-sm text-gray-200 truncate">
                    alex.rivera@example.com
                  </span>
                  <MaterialIcon
                    icon="content_copy"
                    size={16}
                    className="text-gray-500 cursor-pointer hover:text-primary"
                  />
                </div>
              </div>
              <div className="text-left">
                <label className="text-xs font-semibold text-[#9b92c9] uppercase tracking-wider mb-1 block">
                  Location
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MaterialIcon
                    icon="location_on"
                    size={18}
                    className="text-[#9b92c9]"
                  />
                  San Francisco, CA
                </div>
              </div>
              <div className="pt-4 border-t border-[#292348] w-full flex flex-col gap-3">
                <button className="w-full py-2.5 px-4 rounded-lg bg-[#292348] hover:bg-[#342d59] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <MaterialIcon icon="settings" size={18} />
                  Edit Profile
                </button>
                <button className="w-full py-2.5 px-4 rounded-lg bg-transparent border border-[#292348] hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 text-[#9b92c9] text-sm font-medium transition-all cursor-pointer">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Right: Settings */}
        <AnimateIn delay={200} className="lg:col-span-8 flex flex-col gap-6">
          {/* Generation Settings */}
          <section className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-white">
                    Generation Settings
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30">
                    <MaterialIcon icon="tune" size={12} />
                    Customizable
                  </span>
                </div>
                <p className="text-[#9b92c9] text-sm">
                  Configure default parameters for your AI models.
                </p>
              </div>
              <button className="bg-[#292348] hover:bg-[#342d59] text-white px-4 py-2 rounded-lg text-xs font-medium border border-[#292348] transition-all flex items-center gap-2 cursor-pointer">
                <MaterialIcon icon="restart_alt" size={16} />
                Reset Defaults
              </button>
            </div>

            {/* Toggle rows */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#131022]/40 border border-[#292348]">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    Real-time Processing (MagentaRT)
                  </span>
                  <span className="text-xs text-[#9b92c9]">
                    Enable low-latency generation for live sessions.
                  </span>
                </div>
                <Toggle
                  checked={toggles.realtime}
                  onChange={() => toggle("realtime")}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#131022]/40 border border-[#292348]">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    Advanced LLM Reasoning (GPT-4)
                  </span>
                  <span className="text-xs text-[#9b92c9]">
                    Use more tokens for complex lyric structure analysis.
                  </span>
                </div>
                <Toggle
                  checked={toggles.llm}
                  onChange={() => toggle("llm")}
                />
              </div>
            </div>

            {/* Engine cards */}
            <div className="flex flex-col gap-6">
              {/* Instrumental */}
              <div className="bg-[#131022]/40 rounded-xl p-4 border border-[#292348]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <MaterialIcon
                      icon="piano"
                      size={20}
                      className="text-purple-400"
                    />
                    <span className="text-white font-semibold text-sm">
                      Instrumental Engine (StableAudio)
                    </span>
                  </div>
                  <Toggle
                    checked={toggles.instrumental}
                    onChange={() => toggle("instrumental")}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Engine Version"
                    options={[
                      "Symphony v4.0 (Latest)",
                      "Symphony v3.5",
                      "Classic v2.1",
                    ]}
                  />
                  <Select
                    label="Default Mood"
                    options={["Cinematic", "Upbeat", "Melancholic", "Ambient"]}
                  />
                </div>
              </div>

              {/* Vocal */}
              <div className="bg-[#131022]/40 rounded-xl p-4 border border-[#292348]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <MaterialIcon
                      icon="lyrics"
                      size={20}
                      className="text-pink-400"
                    />
                    <span className="text-white font-semibold text-sm">
                      Vocal & Lyric Model (ACE-STEP 1.5)
                    </span>
                  </div>
                  <Toggle
                    checked={toggles.vocal}
                    onChange={() => toggle("vocal")}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Language Model"
                    options={[
                      "GPT-4o Creative",
                      "Claude 3 Opus",
                      "Moment Specific v2",
                    ]}
                  />
                  <Select
                    label="Rhyme Scheme"
                    options={[
                      "AABB (Standard)",
                      "ABAB (Cross)",
                      "Free Verse",
                    ]}
                  />
                </div>
              </div>

              {/* Narration */}
              <div className="bg-[#131022]/40 rounded-xl p-4 border border-[#292348]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <MaterialIcon
                      icon="record_voice_over"
                      size={20}
                      className="text-blue-400"
                    />
                    <span className="text-white font-semibold text-sm">
                      Narration Voice (ElevenLabs)
                    </span>
                  </div>
                  <Toggle
                    checked={toggles.narration}
                    onChange={() => toggle("narration")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9b92c9] mb-1.5">
                    Preferred Voice Actor
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-[#131022] border border-[#292348] rounded-lg">
                    <div className="size-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">
                      JD
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white">James D.</div>
                      <div className="text-[10px] text-[#9b92c9]">
                        Deep American Male
                      </div>
                    </div>
                    <button className="text-primary hover:text-white text-xs font-medium cursor-pointer">
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Status */}
          <section className="glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-white mb-6">
              System Status & Usage
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cloud Storage */}
              <div className="flex flex-col gap-3 p-4 bg-[#131022]/30 rounded-xl border border-[#292348]/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <MaterialIcon
                      icon="cloud"
                      size={18}
                      className="text-[#9b92c9]"
                    />
                    Cloud Storage
                  </span>
                  <span className="text-sm font-bold text-white">75%</span>
                </div>
                <div className="w-full bg-[#131022] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-[#8b5cf6] h-1.5 rounded-full"
                    style={{ width: "75%" }}
                  />
                </div>
                <span className="text-xs text-[#9b92c9]">
                  7.5 GB of 10 GB used
                </span>
              </div>

              {/* Credits */}
              <div className="flex flex-col gap-3 p-4 bg-[#131022]/30 rounded-xl border border-[#292348]/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <MaterialIcon
                      icon="music_note"
                      size={18}
                      className="text-[#9b92c9]"
                    />
                    Credits
                  </span>
                  <span className="text-sm font-bold text-white">320</span>
                </div>
                <div className="w-full bg-[#131022] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-primary h-1.5 rounded-full"
                    style={{ width: "32%" }}
                  />
                </div>
                <span className="text-xs text-[#9b92c9]">
                  Resets in 12 days
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Connected Services */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#131022]/40 border border-[#292348]">
                <h4 className="text-sm font-semibold text-white mb-1">
                  Connected Services
                </h4>
                <div className="space-y-3">
                  {[
                    { name: "Gemini API", status: "Online", color: "green" },
                    { name: "GPT API", status: "Online", color: "green" },
                    { name: "ElevenLabs", status: "Latency", color: "yellow" },
                  ].map((svc, i) => (
                    <div
                      key={svc.name}
                      className={cn(
                        "flex items-center justify-between",
                        i > 0 && "border-t border-[#292348] pt-2"
                      )}
                    >
                      <span className="text-xs text-[#9b92c9]">
                        {svc.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            svc.color === "green"
                              ? "text-green-400"
                              : "text-yellow-400"
                          )}
                        >
                          {svc.status}
                        </span>
                        <div
                          className={cn(
                            "size-1.5 rounded-full",
                            svc.color === "green"
                              ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]"
                              : "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gateway + Logs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#131022]/40 border border-[#292348]">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                    <span className="text-sm text-white font-medium">
                      Gateway v2.4 Active
                    </span>
                  </div>
                  <button className="text-xs text-[#9b92c9] hover:text-white transition-colors cursor-pointer">
                    Configure
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#131022]/40 border border-[#292348]">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                    <span className="text-sm text-white font-medium">
                      System Logs
                    </span>
                  </div>
                  <button className="text-xs text-[#9b92c9] hover:text-white transition-colors cursor-pointer">
                    View Log
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-[#292348] flex justify-between items-center">
              <div className="flex gap-4">
                <span className="text-xs text-[#9b92c9] hover:text-white cursor-pointer">
                  Privacy Policy
                </span>
                <span className="text-xs text-[#9b92c9] hover:text-white cursor-pointer">
                  Terms of Service
                </span>
              </div>
              <div className="text-xs text-[#564f7a]">MomentMusic v3.1.0</div>
            </div>
          </section>
        </AnimateIn>
      </div>
    </PageLayout>
  );
}
