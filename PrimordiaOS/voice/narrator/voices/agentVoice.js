export function agentVoice(commentary = []) {
  if (!commentary || !commentary.length) return [];
  return commentary.map(item => {
    const text = typeof item === "string" ? item : item.message;
    const role = typeof item === "object" && item.role ? item.role : "The Council";
    return `${role} observes: "${text}"`;
  });
}
