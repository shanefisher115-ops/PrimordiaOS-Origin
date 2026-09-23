import { narrate } from "../../../voice/narrator/index.js";
import { eventBus } from "../../../kernel/event-bus.js";

export async function step5_synthesizeVoice(commentaryData) {
  console.log("🔊 [Step 5/7] Synthesizing acoustic narrator layers...");
  const text = typeof commentaryData === "string" ? commentaryData : (commentaryData?.commentaryText || commentaryData?.commentary || "");
  const lines = Array.isArray(commentaryData?.councilLines) ? commentaryData.councilLines : [text];
  try {
    narrate({ pulse: "diff", commentary: lines });
  } catch (err) {
    // Narrator fallback
  }

  const payload = {
    pulse: "diff",
    commentary: text,
    synthesized: true,
    timestamp: Date.now()
  };

  eventBus.emit("VOICE_SYNTHESIZED", payload);
  return payload;
}