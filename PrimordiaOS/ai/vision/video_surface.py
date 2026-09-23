import subprocess
import tempfile
import os
import shutil
from pathlib import Path

def get_ffmpeg_bin():
    """Locate ffmpeg on system PATH or fallback to bundled imageio_ffmpeg binary."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def write_frames_to_dir(frames, fps, frames_dir):
    frames_dir.mkdir(parents=True, exist_ok=True)
    for i, frame_path in enumerate(frames):
        target = frames_dir / f"frame_{i:06d}.png"
        if Path(frame_path).resolve() != target.resolve():
            shutil.copy2(frame_path, target)

def render_video(frames, audio_path, output_path, fps=24):
    """
    frames: list of paths to image frames (png/jpg)
    audio_path: path to audio file (wav/mp3) or None
    output_path: final mp4 path
    """
    output_path = Path(output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg_bin = get_ffmpeg_bin()

    with tempfile.TemporaryDirectory() as tmpdir:
        frames_dir = Path(tmpdir) / "frames"
        write_frames_to_dir(frames, fps, frames_dir)

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

def generate_directive_frames(directive: str, duration_sec: int = 3, fps: int = 24):
    """Generate visual frames and audio waveform from directive text."""
    import math
    import wave
    import struct
    from PIL import Image, ImageDraw

    tmpdir = Path(tempfile.mkdtemp(prefix="primordia_render_"))
    frames = []
    
    width, height = 1280, 720
    total_frames = duration_sec * fps
    
    for f in range(total_frames):
        img = Image.new("RGB", (width, height), (2, 4, 12))
        draw = ImageDraw.Draw(img)
        
        # Cyberpunk vector grid
        for x in range(0, width, 40):
            draw.line([(x, 0), (x, height)], fill=(8, 20, 36))
        for y in range(0, height, 40):
            draw.line([(0, y), (width, y)], fill=(8, 20, 36))
            
        # Pulsing energy core
        cx, cy = width // 2, height // 2
        prog = f / total_frames
        rad = 70 + int(math.sin(prog * math.pi * 4) * 25)
        
        draw.ellipse([cx - rad * 1.5, cy - rad * 0.5, cx + rad * 1.5, cy + rad * 0.5], outline=(0, 240, 255), width=3)
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], outline=(255, 0, 127), width=2)
        draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(255, 215, 0))
        
        # HUD overlays
        draw.text((60, 50), "PRIMORDIAOS // MOVIEFORGE 4K NEURAL RENDERER", fill=(0, 240, 255))
        draw.text((60, 80), f"DIRECTIVE: {directive}", fill=(255, 255, 255))
        draw.text((60, 110), f"STATUS: SYNCHRONIZED | FRAME {f+1}/{total_frames} ({(prog*100):.1f}%)", fill=(0, 255, 157))
        draw.text((60, height - 60), "SOVEREIGN SYSTEM ARCHITECTURE // ZERO PASSIVE COLLAPSE", fill=(148, 163, 184))
        
        frame_file = tmpdir / f"frame_{f:06d}.png"
        img.save(frame_file)
        frames.append(str(frame_file))
        
    # Generate cyber synth audio track
    audio_file = tmpdir / "audio.wav"
    sample_rate = 44100
    n_samples = duration_sec * sample_rate
    with wave.open(str(audio_file), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for i in range(n_samples):
            t = i / sample_rate
            freq = 220 + math.sin(t * 6) * 80 + math.sin(t * 18) * 40
            val = int(math.sin(2 * math.pi * freq * t) * 14000 * max(0, 1 - (t % 1)))
            wav.writeframes(struct.pack("<h", val))
            
    return frames, str(audio_file)

if __name__ == "__main__":
    print(f"video_surface engine ready. ffmpeg binary: {get_ffmpeg_bin()}")
