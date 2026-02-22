import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  className?: string;
}

export default function AudioVisualizer({
  audioElement,
  isPlaying,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  // Connect audio element to analyser — only once per element
  useEffect(() => {
    if (!audioElement) return;
    if (sourceRef.current) return;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    contextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      ctx.close();
      contextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [audioElement]);

  const draw = useCallback((canvas: HTMLCanvasElement, analyser: AnalyserNode | null, playing: boolean) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas resolution to display size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Extract frequency bands
    let bass = 0;
    let mids = 0;
    let highs = 0;

    if (analyser && playing) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      // Bass: bins 0-5
      for (let i = 0; i <= 5; i++) bass += data[i];
      bass = bass / (6 * 255);

      // Mids: bins 6-20
      for (let i = 6; i <= 20; i++) mids += data[i];
      mids = mids / (15 * 255);

      // Highs: bins 21+
      let highCount = 0;
      for (let i = 21; i < data.length; i++) {
        highs += data[i];
        highCount++;
      }
      highs = highCount > 0 ? highs / (highCount * 255) : 0;
    }

    // When paused, use static dim values
    const staticGlow = 0.15;
    const bAmp = playing ? bass : staticGlow;
    const mAmp = playing ? mids : staticGlow * 0.8;
    const hAmp = playing ? highs : staticGlow * 0.5;

    // Base radius from smaller dimension
    const baseRadius = Math.min(w, h) * 0.22;

    // --- Outer ring (bass-driven) ---
    const outerScale = 1.0 + bAmp * 0.3;
    const outerRadius = baseRadius * 1.6 * outerScale;
    const outerOpacity = 0.15 + bAmp * 0.4;

    ctx.save();
    ctx.shadowColor = "rgba(99, 71, 255, 0.6)";
    ctx.shadowBlur = 40 + bAmp * 60;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    const outerGrad = ctx.createRadialGradient(cx, cy, outerRadius * 0.6, cx, cy, outerRadius);
    outerGrad.addColorStop(0, `rgba(99, 71, 255, ${outerOpacity * 0.5})`);
    outerGrad.addColorStop(1, "rgba(99, 71, 255, 0)");
    ctx.fillStyle = outerGrad;
    ctx.fill();
    ctx.restore();

    // --- Middle ring (mids-driven) ---
    const midScale = 1.0 + mAmp * 0.25;
    const midRadius = baseRadius * 1.2 * midScale;
    const midOpacity = 0.2 + mAmp * 0.45;

    ctx.save();
    ctx.shadowColor = "rgba(99, 71, 255, 0.5)";
    ctx.shadowBlur = 30 + mAmp * 50;
    ctx.beginPath();
    ctx.arc(cx, cy, midRadius, 0, Math.PI * 2);
    const midGrad = ctx.createRadialGradient(cx, cy, midRadius * 0.4, cx, cy, midRadius);
    midGrad.addColorStop(0, `rgba(120, 90, 255, ${midOpacity * 0.6})`);
    midGrad.addColorStop(1, "rgba(99, 71, 255, 0)");
    ctx.fillStyle = midGrad;
    ctx.fill();
    ctx.restore();

    // --- Inner glow (highs-driven) ---
    const innerRadius = baseRadius * 0.7;
    const innerOpacity = 0.25 + hAmp * 0.5;

    ctx.save();
    ctx.shadowColor = "rgba(140, 120, 255, 0.7)";
    ctx.shadowBlur = 20 + hAmp * 40;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
    innerGrad.addColorStop(0, `rgba(160, 140, 255, ${innerOpacity * 0.7})`);
    innerGrad.addColorStop(0.6, `rgba(99, 71, 255, ${innerOpacity * 0.3})`);
    innerGrad.addColorStop(1, "rgba(99, 71, 255, 0)");
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.restore();
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resume AudioContext if suspended
    if (isPlaying && contextRef.current?.state === "suspended") {
      contextRef.current.resume();
    }

    let running = true;

    const loop = () => {
      if (!running) return;
      draw(canvas, analyserRef.current, isPlaying);
      rafRef.current = requestAnimationFrame(loop);
    };

    // Always run the loop (draws static glow when paused)
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none", className)}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
