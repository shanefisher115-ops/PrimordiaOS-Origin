import { buildNarration } from "./pipeline/buildNarration.js";
import { speak } from "./pipeline/speak.js";

export function narrate({ diff = "", commentary = [], pulse = "", enableTTS = false } = {}) {
  const lines = buildNarration({ diff, commentary, pulse });
  speak(lines, { enableTTS });
  return lines;
}

export { schemaVoice } from "./voices/schemaVoice.js";
export { agentVoice } from "./voices/agentVoice.js";
export { pulseVoice } from "./voices/pulseVoice.js";
export { buildNarration } from "./pipeline/buildNarration.js";
export { speak } from "./pipeline/speak.js";
