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
}

export interface EnvironmentData {
  location: string;
  weather: string;
  time: string;
}
