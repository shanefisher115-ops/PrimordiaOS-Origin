export function Advisor(diff = "") {
  const normalized = diff.toLowerCase();
  const commentary = [];
  if (normalized.includes("create table")) {
    commentary.push({ role: "Advisor", type: "advice", badge: "?? SYSTEM GUIDANCE", message: "Advisor: Consider adding automated ledger event triggers for new entities." });
  }
  if (normalized.includes("alter table")) {
    commentary.push({ role: "Advisor", type: "advice", badge: "?? SYSTEM GUIDANCE", message: "Advisor: Review agent state models for compatibility." });
  }
  return commentary;
}
