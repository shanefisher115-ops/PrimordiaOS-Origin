/**
 * PrimordiaOS Voice Narrator with Kokoro TTS Integration
 */

export function speak(lines = [], options = {}) {
  if (!lines || !lines.length) return lines;

  console.log("\n=======================================================");
  console.log("🗣️  [PRIMORDIAOS KOKORO NARRATOR]");
  console.log("=======================================================");
  for (const line of lines) {
    console.log(`› ${line}`);
  }
  console.log("=======================================================\n");

  // Send to Kokoro Voice Daemon if TTS is enabled (default: true)
  if (options.enableTTS !== false) {
    try {
      const text = lines.join(" ");
      fetch("http://127.0.0.1:5050/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: options.voice || "af_sarah",
          speed: options.speed || 1.05
        }),
        signal: AbortSignal.timeout(2000)
      }).catch(() => {
        // Voice daemon offline; echo-only fallback
      });
    } catch (_) {}
  }

  return lines;
}
