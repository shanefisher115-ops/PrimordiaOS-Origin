import { schemaVoice } from "../voices/schemaVoice.js";
import { agentVoice } from "../voices/agentVoice.js";
import { pulseVoice } from "../voices/pulseVoice.js";

export function buildNarration({ diff = "", commentary = [], pulse = "" } = {}) {
  const lines = [
    ...pulseVoice(pulse),
    ...schemaVoice(diff),
    ...agentVoice(commentary)
  ];
  return lines.filter(Boolean);
}
