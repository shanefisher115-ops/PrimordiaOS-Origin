"use strict";
// ============================================================
//   PURL SAFETY — Safe Mode + PVE Kernel Protection
// ============================================================
//
//   Validates commands BEFORE engine routing.
//   Two layers of protection:
//     1. Safe Mode — blocks destructive intents entirely
//     2. PVE Kernel Protection — rejects payloads that target
//        protected entities (kernel, root, worldstate, etc.)
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.PVE_PROTECTED_ENTITIES = exports.SAFE_MODE_BLOCKED = void 0;
exports.validateCommand = validateCommand;
// ─── Safe Mode: Blocked Intents ─────────────────────────────
exports.SAFE_MODE_BLOCKED = new Set([
    "system.destroy",
    "system.shutdown",
    "system.wipe",
    "kernel.override",
    "kernel.replace",
    "world.reset",
    "world.destroy",
    "agent.killAll",
    "agent.purge",
    "cloud.nuke",
]);
// ─── PVE: Protected Entities ────────────────────────────────
exports.PVE_PROTECTED_ENTITIES = new Set([
    "kernel",
    "root",
    "worldstate",
    "constitution",
    "guardian",
    "osmium",
    "primordiaflow",
]);
// ─── Primary Validator ──────────────────────────────────────
function validateCommand(intent, payload) {
    const violations = [];
    // ── Layer 1: Safe Mode ──────────────────────────────────
    if (exports.SAFE_MODE_BLOCKED.has(intent)) {
        violations.push(`SAFE_MODE: Intent "${intent}" is blocked. Destructive commands are not permitted.`);
    }
    // ── Layer 2: PVE Kernel Protection ──────────────────────
    checkPVE(payload, "", violations);
    return {
        allowed: violations.length === 0,
        violations,
    };
}
// ─── PVE Deep Scan ──────────────────────────────────────────
// Recursively checks all string values in the payload for
// references to protected entities.
function checkPVE(obj, path, violations) {
    if (typeof obj === "string") {
        const lower = obj.toLowerCase();
        for (const entity of exports.PVE_PROTECTED_ENTITIES) {
            if (lower === entity || lower.startsWith(entity + ".") || lower.startsWith(entity + "/")) {
                violations.push(`PVE_PROTECTION: Payload field "${path}" targets protected entity "${entity}". Modification denied.`);
            }
        }
        return;
    }
    if (Array.isArray(obj)) {
        obj.forEach((item, i) => checkPVE(item, `${path}[${i}]`, violations));
        return;
    }
    if (obj !== null && typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
            // Check both the key and the value
            const fieldPath = path ? `${path}.${key}` : key;
            // Special check: if the key is "target", "entity", or "id", validate its value
            if (["target", "entity", "id", "agentId", "nodeId"].includes(key) && typeof value === "string") {
                const lowerVal = value.toLowerCase();
                for (const entity of exports.PVE_PROTECTED_ENTITIES) {
                    if (lowerVal === entity) {
                        violations.push(`PVE_PROTECTION: Field "${fieldPath}" = "${value}" targets protected entity "${entity}". Modification denied.`);
                    }
                }
            }
            checkPVE(value, fieldPath, violations);
        }
    }
}
