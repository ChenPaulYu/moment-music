import asyncio
from pathlib import Path


async def mix_narration_and_music(
    voice_path: Path, music_path: Path, output_path: Path
) -> Path:
    """Layer narration voice over background music using soundfile + numpy."""
    import numpy as np
    import soundfile as sf

    def _mix():
        voice, voice_sr = sf.read(str(voice_path), dtype="float32")
        music, music_sr = sf.read(str(music_path), dtype="float32")

        # Resample music to match voice sample rate if needed
        if music_sr != voice_sr:
            indices = np.round(np.arange(0, len(music), music_sr / voice_sr)).astype(int)
            indices = indices[indices < len(music)]
            music = music[indices]

        # Ensure both are 1D (mono) for simple mixing
        if voice.ndim > 1:
            voice = voice.mean(axis=1)
        if music.ndim > 1:
            music = music.mean(axis=1)

        # Match lengths — trim music or pad voice
        target_len = max(len(voice), len(music))
        if len(voice) < target_len:
            voice = np.pad(voice, (0, target_len - len(voice)))
        if len(music) < target_len:
            # Loop music to fill duration
            repeats = (target_len // len(music)) + 1
            music = np.tile(music, repeats)[:target_len]
        else:
            music = music[:target_len]

        # Mix: voice at full volume, music ducked to 25%
        mixed = voice + music * 0.25
        # Normalize to prevent clipping
        peak = np.abs(mixed).max()
        if peak > 0.95:
            mixed = mixed * (0.95 / peak)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output_path), mixed, samplerate=voice_sr)

    await asyncio.to_thread(_mix)
    return output_path
