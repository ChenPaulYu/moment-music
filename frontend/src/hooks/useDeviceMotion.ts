import { useState, useRef, useCallback, useEffect } from "react";

interface MotionReading {
  timestamp: number;
  acceleration: { x: number; y: number; z: number };
  rotation: { alpha: number; beta: number; gamma: number };
}

interface DeviceMotionState {
  isCapturing: boolean;
  readings: MotionReading[];
  start: () => void;
  stop: () => void;
  toJSON: () => string;
}

export function useDeviceMotion(): DeviceMotionState {
  const [isCapturing, setIsCapturing] = useState(false);
  const [readings, setReadings] = useState<MotionReading[]>([]);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const stop = useCallback(() => {
    if (handlerRef.current) {
      window.removeEventListener("devicemotion", handlerRef.current);
      handlerRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const start = useCallback(() => {
    setReadings([]);
    setIsCapturing(true);

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

    handlerRef.current = handler;
    window.addEventListener("devicemotion", handler);
  }, []);

  const toJSON = useCallback(() => JSON.stringify(readings), [readings]);

  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        window.removeEventListener("devicemotion", handlerRef.current);
      }
    };
  }, []);

  return { isCapturing, readings, start, stop, toJSON };
}
