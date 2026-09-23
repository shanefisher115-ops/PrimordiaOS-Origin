# backend/video_encoder.py
"""PrimordiaOS Video Encoder — frames + audio -> MP4.

Uses ffmpeg (system PATH or bundled imageio_ffmpeg binary) to encode frames
and audio into standard H.264 / AAC MP4 files.
"""

import subprocess
import tempfile
from pathlib import Path
import shutil

def get_ffmpeg_bin() -> str:
    """Locates ffmpeg on system PATH or falls back to bundled imageio_ffmpeg binary."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def encode_video(frames, audio_path, output_path, fps: int = 24) -> str:
    """
    frames: list of file paths to PNG/JPG frames
    audio_path: path to WAV/MP3 file (or None)
    output_path: final MP4 file path
    fps: frames per second (default: 24)
    """

    output_path = Path(output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        frames_dir = Path(tmpdir) / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        # Copy frames into temp directory with ffmpeg naming
        for i, frame in enumerate(frames):
            target = frames_dir / f"frame_{i:06d}.png"
            shutil.copy(frame, target)

        ffmpeg_bin = get_ffmpeg_bin()

        cmd = [
            ffmpeg_bin,
            "-y",
            "-framerate", str(fps),
            "-i", str(frames_dir / "frame_%06d.png"),
        ]

        if audio_path and Path(audio_path).exists() and Path(audio_path).stat().st_size > 0:
            cmd.extend([
                "-i", str(audio_path),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-shortest",
                str(output_path)
            ])
        else:
            cmd.extend([
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                str(output_path)
            ])

        subprocess.run(cmd, check=True)

    return str(output_path)

if __name__ == "__main__":
    print(f"PrimordiaOS Video Encoder ready. FFmpeg: {get_ffmpeg_bin()}")
