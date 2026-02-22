export type CreationMode = "write" | "listen" | "move" | "be";

export type OutputType = "instrumental" | "song" | "narration";

export interface Soundscape {
  id: string;
  title: string;
  mode: CreationMode;
  outputType: OutputType;
  date: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  summary?: string;
  mood_keywords?: string[];
  lyrics?: string;
  narration_text?: string;
  engine?: string;
}

export interface EnvironmentData {
  location: string;
  weather: string;
  time: string;
}

export interface BeGenerateResponse {
  output_type: OutputType;
  mode?: string;
  location?: string;
  weather_summary?: string;
  mood_keywords: string[];
  summary: string;
  audio_url: string;
  image_url?: string;
  engine: string;
  prompt?: string;
  lyrics?: string;
  music_tags?: string;
  narration_text?: string;
  background_music_prompt?: string;
}
