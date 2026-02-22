import type { OutputType } from "./types";

const STORAGE_KEY = "moment-engines";

const DISPLAY_TO_ENGINE: Record<string, string> = {
  "Stable Audio API (Cloud)": "stable_audio_api",
  "Stable Audio Open": "stable_audio_open",
  "ACE-STEP": "ace_step",
  "HeartMuLa": "heart_mula",
};

const DEFAULT_ENGINE = "ace_step";

function readStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getEngineForOutput(outputType: OutputType): string {
  const stored = readStorage();
  return stored[outputType] || DEFAULT_ENGINE;
}

export function setEngineForOutput(
  outputType: OutputType,
  displayLabel: string,
): void {
  const engine = DISPLAY_TO_ENGINE[displayLabel] || DEFAULT_ENGINE;
  const stored = readStorage();
  stored[outputType] = engine;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

const ALBUM_ART_KEY = "moment-album-art";

export function getAlbumArtEnabled(): boolean {
  try {
    const raw = localStorage.getItem(ALBUM_ART_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function setAlbumArtEnabled(enabled: boolean): void {
  localStorage.setItem(ALBUM_ART_KEY, String(enabled));
}

export function getDisplayLabel(outputType: OutputType): string {
  const stored = readStorage();
  const engine = stored[outputType];
  if (!engine) return "";
  const entry = Object.entries(DISPLAY_TO_ENGINE).find(
    ([, v]) => v === engine,
  );
  return entry ? entry[0] : "";
}
