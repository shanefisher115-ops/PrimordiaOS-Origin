export function Predictor(diff = "") {
  const normalized = diff.toLowerCase();
  const commentary = [];
  if (normalized.includes("transaction_rules")) {
    commentary.push({ role: "Predictor", type: "forecast", badge: "?? INTELLIGENCE FORECAST", message: "Predictor: Agents will achieve higher auto-categorization accuracy." });
  }
  if (normalized.includes("goals")) {
    commentary.push({ role: "Predictor", type: "forecast", badge: "?? MILESTONE FORECAST", message: "Predictor: Financial goal tracking precision will increase." });
  }
  return commentary;
}
