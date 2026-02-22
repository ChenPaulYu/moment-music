export type StylePromptKey =
  | "lyrics_style"
  | "narration_style"
  | "bg_music_style"
  | "music_prompt_style"
  | "overall_mood";

const STORAGE_KEY = "moment-style-prompts";

const DEFAULTS: Record<StylePromptKey, string> = {
  lyrics_style:
    "Write lyrics that are poetic, emotionally resonant, and singable. Use vivid imagery and metaphor. Favor a modern indie/folk sensibility.",
  narration_style:
    "Write narration as lyrical prose or spoken poetry. Use sensory language, metaphor, and a contemplative tone. It should feel like a poem being read aloud.",
  bg_music_style:
    "Background music should be ambient, subtle, and atmospheric. It plays underneath narration — supportive, not competing.",
  music_prompt_style:
    "Music prompts should be specific about instruments, tempo, mood, and atmosphere. Include genre hints and emotional texture.",
  overall_mood: "",
};

function readStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(data: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getStylePrompt(key: StylePromptKey): string {
  const stored = readStorage();
  return key in stored ? stored[key] : DEFAULTS[key];
}

export function setStylePrompt(key: StylePromptKey, value: string): void {
  const stored = readStorage();
  stored[key] = value;
  writeStorage(stored);
}

export function resetStylePrompt(key: StylePromptKey): void {
  const stored = readStorage();
  delete stored[key];
  writeStorage(stored);
}

export function getAllStylePrompts(): Record<StylePromptKey, string> {
  const stored = readStorage();
  const result = {} as Record<StylePromptKey, string>;
  for (const key of Object.keys(DEFAULTS) as StylePromptKey[]) {
    result[key] = key in stored ? stored[key] : DEFAULTS[key];
  }
  return result;
}

export function getStylePromptDefault(key: StylePromptKey): string {
  return DEFAULTS[key];
}

export function isStylePromptModified(key: StylePromptKey): boolean {
  const stored = readStorage();
  return key in stored && stored[key] !== DEFAULTS[key];
}
