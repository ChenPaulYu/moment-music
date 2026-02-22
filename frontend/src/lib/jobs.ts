const STORAGE_KEY = "moment-active-job";

interface ActiveJob {
  jobId: string;
  mode: string;
}

export function saveActiveJob(jobId: string, mode: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, mode }));
}

export function getActiveJob(): ActiveJob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearActiveJob(): void {
  localStorage.removeItem(STORAGE_KEY);
}
