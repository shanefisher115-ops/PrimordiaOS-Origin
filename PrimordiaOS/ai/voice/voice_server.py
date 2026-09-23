import os
import re
import json
import queue
import threading
import sounddevice as sd
from kokoro_onnx import Kokoro
from flask import Flask, request, jsonify

app = Flask(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "kokoro-v0_19.onnx")
VOICES_PATH = os.path.join(os.path.dirname(__file__), "voices.bin")

print("[Kokoro] Initializing Kokoro TTS ONNX engine...")
kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
AVAILABLE_VOICES = list(kokoro.get_voices())
print(f"[Kokoro] Engine online. Loaded {len(AVAILABLE_VOICES)} voices.")

SYSTEM_PROMPT = """You are the vocal core of PrimordiaOS.
Respond in 1-2 punchy, declarative sentences.
Never use markdown, lists, asterisks, or emoji."""

# Audio worker queue to play sentences sequentially without freezing Flask
audio_queue = queue.Queue()
playback_lock = threading.Lock()

def audio_worker():
    while True:
        item = audio_queue.get()
        if item is None:
            break
        samples, sample_rate = item
        try:
            with playback_lock:
                sd.play(samples, sample_rate)
                sd.wait()
        except Exception as e:
            print(f"[Kokoro] Audio playback error: {e}")
        finally:
            audio_queue.task_done()

threading.Thread(target=audio_worker, daemon=True).start()

def clean_text_for_speech(text: str) -> str:
    """Removes markdown code fences, urls, and formatting before TTS synthesis."""
    if not text:
        return ""
    # Remove code blocks ```...```
    text = re.sub(r'```[\s\S]*?```', ' Code block omitted. ', text)
    # Remove inline code `...`
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove markdown links [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Remove bold/italic markers
    text = re.sub(r'[*_~#]+', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def synthesize_and_enqueue(sentence: str, voice: str = "af_sarah", speed: float = 1.05):
    """Synthesizes a single sentence and puts it into the playback queue."""
    clean = clean_text_for_speech(sentence)
    if not clean or len(clean) < 2:
        return
    if voice not in AVAILABLE_VOICES:
        voice = "af_sarah"
    try:
        samples, sample_rate = kokoro.create(clean, voice=voice, speed=speed, lang="en-us")
        audio_queue.put((samples, sample_rate))
    except Exception as e:
        print(f"[Kokoro] TTS synthesis error for '{clean[:30]}...': {e}")

def speak_full_text(text: str, voice: str = "af_sarah", speed: float = 1.05):
    """Splits a full block of text into sentences and enqueues each one."""
    clean = clean_text_for_speech(text)
    if not clean:
        return
    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+', clean)
    for sent in sentences:
        sent = sent.strip()
        if sent:
            synthesize_and_enqueue(sent, voice=voice, speed=speed)

@app.route("/health", methods=["GET"])
@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "status": "online",
        "engine": "Kokoro ONNX v0.19",
        "sample_rate": 24000,
        "voices_count": len(AVAILABLE_VOICES),
        "queue_size": audio_queue.qsize(),
        "default_voice": "af_sarah"
    })

@app.route("/voices", methods=["GET"])
def get_voices():
    return jsonify({
        "voices": AVAILABLE_VOICES,
        "default": "af_sarah"
    })

@app.route("/speak", methods=["POST"])
def speak_endpoint():
    payload = request.get_json(force=True) or {}
    text = payload.get("text", "")
    voice = payload.get("voice", "af_sarah")
    speed = float(payload.get("speed", 1.05))

    if not text.strip():
        return jsonify({"error": "Missing 'text' in payload"}), 400

    threading.Thread(target=speak_full_text, args=(text, voice, speed), daemon=True).start()
    return jsonify({
        "status": "queued",
        "text_preview": text[:100],
        "voice": voice,
        "speed": speed
    })

@app.route("/stop", methods=["POST"])
def stop_playback():
    """Immediately stops audio playback and clears pending queue."""
    try:
        with audio_queue.mutex:
            audio_queue.queue.clear()
        sd.stop()
        return jsonify({"status": "stopped", "queue_cleared": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat_and_speak", methods=["POST"])
def chat_and_speak():
    payload = request.get_json(force=True) or {}
    prompt = payload.get("prompt", "")
    voice = payload.get("voice", "af_sarah")
    speed = float(payload.get("speed", 1.05))

    if not prompt:
        return jsonify({"error": "Missing 'prompt' parameter"}), 400

    def generate_and_speak():
        # 1. Try Gemini API first if GEMINI_API_KEY is available
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-3.7-flash",
                    contents=f"{SYSTEM_PROMPT}\n\nUser prompt: {prompt}"
                )
                text = response.text or ""
                speak_full_text(text, voice=voice, speed=speed)
                return
            except Exception as e:
                print(f"[Kokoro] Gemini API fallback error: {e}")

        # 2. Fallback to local Ollama if running
        try:
            import urllib.request
            ollama_url = "http://localhost:11434/api/generate"
            ollama_payload = {
                "model": "llama3.2",
                "system": SYSTEM_PROMPT,
                "prompt": prompt,
                "stream": False
            }
            req = urllib.request.Request(
                ollama_url,
                data=json.dumps(ollama_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                text = result.get("response", "")
                speak_full_text(text, voice=voice, speed=speed)
        except Exception as e:
            print(f"[Kokoro] Ollama generation error: {e}")

    threading.Thread(target=generate_and_speak, daemon=True).start()
    return jsonify({"status": "processing", "prompt": prompt, "voice": voice})

if __name__ == "__main__":
    port = int(os.environ.get("VOICE_PORT", 5050))
    print(f"\n>>> Primordia Kokoro Voice Daemon listening on http://127.0.0.1:{port} <<<\n")
    app.run(host="127.0.0.1", port=port, threaded=True)
