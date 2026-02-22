import type { OutputType, CreationMode, BeGenerateResponse } from "./types";

const API_BASE = "/api";

// --- Job types ---

export interface JobStatus {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  step: number;
  steps: string[];
  result: BeGenerateResponse | null;
  error: string | null;
  mode: string;
  output_type: string;
  queue_position: number;
}

// --- Job API ---

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error("Job not found");
  }
  return res.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/jobs/${jobId}/cancel`, { method: "POST" });
}

// --- Generation API (all return job_id now) ---

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

export async function generateBe(params: {
  location: string;
  outputType: OutputType;
  engine?: string;
  duration?: number;
  generate_image?: boolean;
  style_prompts?: Record<string, string>;
}): Promise<{ job_id: string }> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: params.location,
      output_type: params.outputType,
      ...(params.engine && { engine: params.engine }),
      ...(params.duration && { duration: params.duration }),
      ...(params.generate_image !== undefined && { generate_image: params.generate_image }),
      ...(params.style_prompts && { style_prompts: params.style_prompts }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Generation failed: ${res.status}`);
  }
  return res.json();
}

export async function generateWrite(params: {
  text: string;
  image?: File;
  outputType: OutputType;
  engine?: string;
  generate_image?: boolean;
  style_prompts?: Record<string, string>;
}): Promise<{ job_id: string }> {
  const formData = new FormData();
  formData.append("text", params.text);
  formData.append("output_type", params.outputType);
  if (params.engine) formData.append("engine", params.engine);
  if (params.generate_image !== undefined)
    formData.append("generate_image", String(params.generate_image));
  if (params.style_prompts)
    formData.append("style_prompts", JSON.stringify(params.style_prompts));
  if (params.image) {
    formData.append("image", params.image);
  }
  const res = await fetch("/api/write/generate", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Generation failed: ${res.status}`);
  }
  return res.json();
}

export async function generateListen(params: {
  audio: Blob;
  outputType: OutputType;
  engine?: string;
  generate_image?: boolean;
  style_prompts?: Record<string, string>;
}): Promise<{ job_id: string }> {
  const formData = new FormData();
  formData.append("audio", params.audio, "capture.webm");
  formData.append("output_type", params.outputType);
  if (params.engine) formData.append("engine", params.engine);
  if (params.generate_image !== undefined)
    formData.append("generate_image", String(params.generate_image));
  if (params.style_prompts)
    formData.append("style_prompts", JSON.stringify(params.style_prompts));
  const res = await fetch("/api/listen/generate", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Generation failed: ${res.status}`);
  }
  return res.json();
}

export async function generateMove(params: {
  motionData: string;
  outputType: OutputType;
  engine?: string;
  generate_image?: boolean;
  style_prompts?: Record<string, string>;
}): Promise<{ job_id: string }> {
  const res = await fetch("/api/move/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      motion_data: params.motionData,
      output_type: params.outputType,
      ...(params.engine && { engine: params.engine }),
      ...(params.generate_image !== undefined && { generate_image: params.generate_image }),
      ...(params.style_prompts && { style_prompts: params.style_prompts }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Generation failed: ${res.status}`);
  }
  return res.json();
}

export function getAudioUrl(filename: string): string {
  return `/api/audio/${filename}`;
}

export async function getApiKeyStatus(): Promise<{
  openai: boolean;
  stability: boolean;
  huggingface: boolean;
}> {
  const res = await fetch("/api/settings/keys/status");
  if (!res.ok) throw new Error("Failed to fetch API key status");
  return res.json();
}

export async function saveApiKeys(keys: {
  openai_api_key?: string;
  stability_api_key?: string;
  hf_token?: string;
}): Promise<void> {
  const res = await fetch("/api/settings/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(keys),
  });
  if (!res.ok) throw new Error("Failed to save API keys");
}
