"""Kokoro Voice Connector for PrimordiaOS and Google Antigravity Agents.

Provides seamless text-to-speech output using the local Kokoro ONNX model
and daemon server.
"""

import json
import os
import re
import urllib.request
from typing import Optional

DEFAULT_VOICE = "af_sarah"
DEFAULT_PORT = 5050

def clean_text(text: str) -> str:
    """Cleans markdown, code fences, and symbols for natural speech."""
    if not text:
        return ""
    text = re.sub(r"```[\s\S]*?```", " Code block omitted. ", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"[*_~#]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def speak(text: str, voice: str = DEFAULT_VOICE, speed: float = 1.05, port: int = DEFAULT_PORT) -> bool:
    """Speaks the given text using the Kokoro Voice daemon or local fallback.

    Args:
        text: The text string to speak.
        voice: Voice identifier (e.g. 'af_sarah', 'am_adam', 'af_bella').
        speed: Playback speed multiplier (default: 1.05).
        port: Voice daemon port (default: 5050).

    Returns:
        True if audio was successfully queued or played, False otherwise.
    """
    clean = clean_text(text)
    if not clean:
        return False

    # 1. Try sending to the background Kokoro Voice daemon
    try:
        url = f"http://127.0.0.1:{port}/speak"
        payload = json.dumps({"text": clean, "voice": voice, "speed": speed}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            if resp.status == 200:
                return True
    except Exception:
        pass

    # 2. In-process fallback if daemon is not running
    try:
        from kokoro_onnx import Kokoro
        import sounddevice as sd

        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, "kokoro-v0_19.onnx")
        voices_path = os.path.join(base_dir, "voices.bin")

        if os.path.exists(model_path) and os.path.exists(voices_path):
            k = Kokoro(model_path, voices_path)
            samples, rate = k.create(clean, voice=voice, speed=speed, lang="en-us")
            sd.play(samples, rate)
            sd.wait()
            return True
    except Exception as e:
        print(f"[KokoroVoice] In-process fallback error: {e}")

    return False
