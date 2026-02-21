import type { OutputType, CreationMode } from "./types";

interface GenerateRequest {
  mode: CreationMode;
  outputType: OutputType;
  text?: string;
  audioBlob?: Blob;
  motionData?: string;
  imageFile?: File;
}

interface GenerateResponse {
  id: string;
  audioUrl: string;
  title: string;
  duration: number;
}

export async function generateSoundscape(
  req: GenerateRequest
): Promise<GenerateResponse> {
  const formData = new FormData();
  formData.append("mode", req.mode);
  formData.append("output_type", req.outputType);

  if (req.text) formData.append("text", req.text);
  if (req.audioBlob) formData.append("audio", req.audioBlob, "capture.webm");
  if (req.motionData) formData.append("motion_data", req.motionData);
  if (req.imageFile) formData.append("image", req.imageFile);

  const res = await fetch("/api/generate", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Generation failed: ${res.status}`);
  }

  return res.json();
}

export function getAudioUrl(filename: string): string {
  return `/api/audio/${filename}`;
}
