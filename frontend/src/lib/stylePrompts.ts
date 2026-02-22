export type StylePromptKey =
  | "lyrics_style"
  | "narration_style"
  | "bg_music_style"
  | "music_prompt_style"
  | "overall_mood"
  | "audio_analysis_style"
  | "album_art_style";

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
  audio_analysis_style: "",
  album_art_style: "",
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

// --- Mode-scoped prompt overrides ---

export type CreationMode = "write" | "listen" | "move" | "be";

function modeStorageKey(mode: CreationMode): string {
  return `moment-style-prompts-${mode}`;
}

function readModeStorage(mode: CreationMode): Record<string, string> {
  try {
    const raw = localStorage.getItem(modeStorageKey(mode));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeModeStorage(mode: CreationMode, data: Record<string, string>): void {
  localStorage.setItem(modeStorageKey(mode), JSON.stringify(data));
}

export function getModeStylePrompt(mode: CreationMode, key: StylePromptKey): string {
  const stored = readModeStorage(mode);
  return key in stored ? stored[key] : "";
}

export function setModeStylePrompt(mode: CreationMode, key: StylePromptKey, value: string): void {
  const stored = readModeStorage(mode);
  stored[key] = value;
  writeModeStorage(mode, stored);
}

export function resetModeStylePrompt(mode: CreationMode, key: StylePromptKey): void {
  const stored = readModeStorage(mode);
  delete stored[key];
  writeModeStorage(mode, stored);
}

export function isModeStylePromptModified(mode: CreationMode, key: StylePromptKey): boolean {
  const stored = readModeStorage(mode);
  return key in stored && stored[key] !== "";
}

/** Resolve prompts for a mode: mode override → global → default */
export function getAllStylePromptsForMode(mode: CreationMode): Record<StylePromptKey, string> {
  const globalPrompts = getAllStylePrompts();
  const modeStored = readModeStorage(mode);
  const result = {} as Record<StylePromptKey, string>;
  for (const key of Object.keys(DEFAULTS) as StylePromptKey[]) {
    result[key] = (key in modeStored && modeStored[key]) ? modeStored[key] : globalPrompts[key];
  }
  return result;
}
