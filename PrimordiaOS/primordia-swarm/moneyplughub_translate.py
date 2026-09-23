from google import genai
from google.genai import types

# IMPORTANT: Replace with your valid Gemini API key
client = genai.Client(api_key="<YOUR_NEW_API_KEY>")

model = "gemini-3.5-live-translate-preview"

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    input_audio_transcription=types.AudioTranscriptionConfig(),
    output_audio_transcription=types.AudioTranscriptionConfig(),
    translation_config=types.TranslationConfig(
        target_language_code="pl",        # Polish output
        echo_target_language=True         # Echo translated text
    )
)

async def main():
    print("Starting Gemini 3.5 Live Translate session…")

    async with client.aio.live.connect(model=model, config=config) as session:
        print("Session started. Listening for translated audio…")

        async for response in session.receive():
            if response.server_content:
                if response.server_content.input_transcription:
                    print("Input transcript:",
                          response.server_content.input_transcription.text)

                if response.server_content.output_transcription:
                    print("Translated transcript:",
                          response.server_content.output_transcription.text)

# Run the async function
import asyncio
asyncio.run(main())
