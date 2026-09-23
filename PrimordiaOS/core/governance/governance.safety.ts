import config from "./governance.config.json";

const safetyRules: Record<string, (payload: any) => boolean> = {
  "NO_DELETE_FS": (payload) => payload.action !== "delete_fs",
  "NO_EXTERNAL_POST": (payload) => payload.url?.startsWith("https://") === false
};

export function enforceSafety(agentId: string, payload: any) {
  if (!config.enableSafetyRules) return true;

  for (const ruleName in safetyRules) {
    const rule = safetyRules[ruleName];
    if (!rule(payload)) {
      emitGovernance({
        type: "SAFETY_RULE_VIOLATION",
        agentId,
        rule: ruleName,
        timestamp: Date.now()
      });
      return false;
    }
  }

  return true;
}

function emitGovernance(event: any) {
  globalThis.PRIMORDIA_GOVERNANCE_BUS.push(event);
}
