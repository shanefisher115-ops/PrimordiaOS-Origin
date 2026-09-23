import fs from "node:fs";
import path from "node:path";

const CANONICAL_DIRS = [
  "primordiaos/kernel",
  "primordiaos/agents",
  "primordiaos/realms/local",
  "primordiaos/realms/cloud",
  "primordiaos/realms/simulation",
  "primordiaos/realms/economy",
  "primordiaos/realms/identity",
  "primordiaos/pipelines",
  "primordiaos/simulation",
  "primordiaos/identity",
  "primordiaos/economy",
  "primordiaos/interfaces",
  "primordiaos/vessels",
  "primordiaos/config",
  "primordiaos/docs",
  "primordiaos/archive"
];

/**
 * Initializes the full canonical directory spine for PrimordiaOS.
 * @param {string} workspaceRoot
 */
export function ensureCanonicalSpine(workspaceRoot) {
  const created = [];
  for (const dir of CANONICAL_DIRS) {
    const fullPath = path.join(workspaceRoot, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      created.push(dir);
    }
  }
  return created;
}
