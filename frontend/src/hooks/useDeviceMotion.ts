import { useState, useRef, useCallback, useEffect } from "react";

interface MotionReading {
  timestamp: number;
  acceleration: { x: number; y: number; z: number };
  rotation: { alpha: number; beta: number; gamma: number };
}

type InputSource = "device" | "pointer" | null;

interface DeviceMotionState {
  isCapturing: boolean;
  elapsed: number;
  readings: MotionReading[];
  inputSource: InputSource;
  start: () => Promise<void>;
  stop: () => void;
  toJSON: () => string;
}

/** Scale factor: convert pixel deltas to acceleration-like values. */
const PX_TO_ACC = 0.15;

function hasNativeMotion(): boolean {
  return "DeviceMotionEvent" in window && "ontouchstart" in window;
}

async function requestIOSPermission(): Promise<boolean> {
  const DME = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof DME.requestPermission === "function") {
    const permission = await DME.requestPermission();
    return permission === "granted";
  }
  return true; // non-iOS, no permission needed
}

export function useDeviceMotion(maxDuration = 10): DeviceMotionState {
  const [isCapturing, setIsCapturing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [readings, setReadings] = useState<MotionReading[]>([]);
  const [inputSource, setInputSource] = useState<InputSource>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const prevPointer = useRef<{ x: number; y: number; time: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const stop = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    prevPointer.current = null;
    clearInterval(timerRef.current);
    setIsCapturing(false);
  }, []);

  const startDeviceMotion = useCallback(() => {
    setInputSource("device");

    const handler = (e: DeviceMotionEvent) => {
      const reading: MotionReading = {
        timestamp: Date.now(),
        acceleration: {
          x: e.accelerationIncludingGravity?.x ?? 0,
          y: e.accelerationIncludingGravity?.y ?? 0,
          z: e.accelerationIncludingGravity?.z ?? 0,
        },
        rotation: {
          alpha: e.rotationRate?.alpha ?? 0,
          beta: e.rotationRate?.beta ?? 0,
          gamma: e.rotationRate?.gamma ?? 0,
        },
      };
      setReadings((prev) => [...prev, reading]);
    };

    window.addEventListener("devicemotion", handler);
    cleanupRef.current = () => window.removeEventListener("devicemotion", handler);
  }, []);

  const startPointerFallback = useCallback(() => {
    setInputSource("pointer");

    const handler = (e: PointerEvent) => {
      const now = Date.now();
      const prev = prevPointer.current;

      if (prev) {
        const dt = Math.max(now - prev.time, 1) / 1000; // seconds
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;

        // Convert pointer deltas to acceleration-like values
        const reading: MotionReading = {
          timestamp: now,
          acceleration: {
            x: dx * PX_TO_ACC,
            y: dy * PX_TO_ACC,
            z: 9.8 + speed * 0.005, // baseline gravity + speed perturbation
          },
          rotation: {
            alpha: Math.atan2(dy, dx) * (180 / Math.PI), // direction angle
            beta: dy * 0.5, // vertical movement rate
            gamma: dx * 0.5, // horizontal movement rate
          },
        };
        setReadings((prev) => [...prev, reading]);
      }

      prevPointer.current = { x: e.clientX, y: e.clientY, time: now };
    };

    window.addEventListener("pointermove", handler);
    cleanupRef.current = () => window.removeEventListener("pointermove", handler);
  }, []);

  const start = useCallback(async () => {
    setReadings([]);
    setElapsed(0);
    setIsCapturing(true);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const secs = (Date.now() - startTimeRef.current) / 1000;
      setElapsed(secs);
      if (secs >= maxDuration) stop();
    }, 100);

    if (hasNativeMotion()) {
      const granted = await requestIOSPermission();
      if (granted) {
        startDeviceMotion();
        return;
      }
      // Permission denied — fall through to pointer
    }

    startPointerFallback();
  }, [maxDuration, stop, startDeviceMotion, startPointerFallback]);

  const toJSON = useCallback(() => JSON.stringify(readings), [readings]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      clearInterval(timerRef.current);
    };
  }, []);

  return { isCapturing, elapsed, readings, inputSource, start, stop, toJSON };
}
