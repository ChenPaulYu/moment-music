import { useState, useRef, useCallback, useEffect } from "react";

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setSource: (url: string) => void;
}

export function useAudioPlayer(): AudioPlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () =>
      setCurrentTime(audio.currentTime)
    );
    audio.addEventListener("loadedmetadata", () =>
      setDuration(audio.duration)
    );
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setSource = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
    }
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return { isPlaying, currentTime, duration, progress, play, pause, seek, setSource };
}
