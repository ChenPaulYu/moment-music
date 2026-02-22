import type { BeGenerateResponse, Soundscape, CreationMode, OutputType } from "./types";

const STORAGE_KEY = "moment-library";

const MODE_LABELS: Record<CreationMode, string> = {
  write: "Written",
  listen: "Listened",
  move: "Moved",
  be: "Felt",
};

export function saveSoundscape(data: BeGenerateResponse): Soundscape {
  const mode = (data.mode ?? "be") as CreationMode;
  const keyword = data.mood_keywords?.[0]?.replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Moment";
  const title = `${keyword} — ${MODE_LABELS[mode]}`;

  const soundscape: Soundscape = {
    id: crypto.randomUUID(),
    title,
    mode,
    outputType: data.output_type as OutputType,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    imageUrl: data.image_url,
    audioUrl: data.audio_url,
    summary: data.summary,
    mood_keywords: data.mood_keywords,
    lyrics: data.lyrics,
    narration_text: data.narration_text,
    engine: data.engine,
  };

  const existing = getSoundscapes();
  existing.unshift(soundscape);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  return soundscape;
}

export function getSoundscapes(): Soundscape[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Soundscape[];
  } catch {
    return [];
  }
}

export function deleteSoundscape(id: string): void {
  const items = getSoundscapes().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
