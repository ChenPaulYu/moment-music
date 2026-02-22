import { useState, useRef, useCallback, useEffect } from "react";

interface AudioCaptureState {
  isRecording: boolean;
  elapsed: number;
  audioBlob: Blob | null;
  start: () => Promise<void>;
  stop: () => void;
}

function pickMimeType(): string {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useAudioCapture(maxDuration = 10): AudioCaptureState {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mimeRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const start = useCallback(async () => {
    setAudioBlob(null);
    setElapsed(0);
    chunks.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickMimeType();
    mimeRef.current = mime;
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorder.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    recorder.onstop = () => {
      const type = mimeRef.current || recorder.mimeType || "audio/webm";
      const blob = new Blob(chunks.current, { type });
      setAudioBlob(blob);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(1000); // collect data every 1s for reliable capture
    setIsRecording(true);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const secs = (Date.now() - startTimeRef.current) / 1000;
      setElapsed(secs);
      if (secs >= maxDuration) stop();
    }, 100);
  }, [maxDuration, stop]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  return { isRecording, elapsed, audioBlob, start, stop };
}
