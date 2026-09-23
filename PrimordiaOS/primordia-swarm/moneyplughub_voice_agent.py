import asyncio
import json
import pyaudio
import websockets
from google import genai
from google.genai import types

# ------------------------------------------------------------
#  MONEYPLUGHUB VOICE AGENT — CONFIGURATION
# ------------------------------------------------------------

API_KEY = "<YOUR_NEW_VALID_GEMINI_API_KEY>"   # Replace this
TARGET_LANG = "pl"                            # Polish output (change as needed)
WEBHOOK_URL = "https://api.moneyplughub.com/voice-events"  # Replace with your real webhook

client = genai.Client(api_key=API_KEY)
model = "gemini-3.5-live-translate-preview"

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    input_audio_transcription=types.AudioTranscriptionConfig(),
    output_audio_transcription=types.AudioTranscriptionConfig(),
    translation_config=types.TranslationConfig(
        target_language_code=TARGET_LANG,
        echo_target_language=True
    )
)

# ------------------------------------------------------------
#  AUDIO CAPTURE (MICROPHONE STREAM)
# ------------------------------------------------------------

CHUNK = 4096
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000

audio = pyaudio.PyAudio()
stream = audio.open(
    format=FORMAT,
    channels=CHANNELS,
    rate=RATE,
    input=True,
    frames_per_buffer=CHUNK
)

# ------------------------------------------------------------
#  WEBHOOK DISPATCH
# ------------------------------------------------------------

async def dispatch_webhook(event_type, payload):
    try:
        async with websockets.connect(WEBHOOK_URL) as ws:
            await ws.send(json.dumps({
                "event": event_type,
                "payload": payload
            }))
    except Exception as e:
        print(f"[Webhook] Failed dispatch: {e}")

# ------------------------------------------------------------
#  MONEYPLUGHUB VOICE AGENT LOGIC
# ------------------------------------------------------------

async def moneyplughub_voice_agent():
    print("\n🔊 MoneyPlugHub Voice Agent: Initializing Gemini 3.5 Live Translate…")

    async with client.aio.live.connect(model=model, config=config) as session:
        print("🌐 Connected to Gemini Live Translate.")
        print("🎤 Listening for customer speech…\n")

        async def send_audio():
            while True:
                data = stream.read(CHUNK)
                await session.send(types.InputAudio(data=data))

        async def receive_events():
            async for response in session.receive():
                if response.server_content:

                    # -----------------------------
                    #  INPUT SPEECH (Customer)
                    # -----------------------------
                    if response.server_content.input_transcription:
                        text = response.server_content.input_transcription.text
                        print(f"👤 Customer said: {text}")

                        await dispatch_webhook("customer_speech", {
                            "transcript": text,
                            "language": "auto"
                        })

                    # -----------------------------
                    #  OUTPUT SPEECH (Translated)
                    # -----------------------------
                    if response.server_content.output_transcription:
                        translated = response.server_content.output_transcription.text
                        print(f"🤖 Agent (translated): {translated}")

                        await dispatch_webhook("agent_translation", {
                            "translated_text": translated,
                            "target_language": TARGET_LANG
                        })

        await asyncio.gather(send_audio(), receive_events())

# ------------------------------------------------------------
#  ENTRY POINT
# ------------------------------------------------------------

asyncio.run(moneyplughub_voice_agent())
