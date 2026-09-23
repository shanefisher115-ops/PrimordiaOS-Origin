// diagnostics/proof-log.ts

import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "proof-log.json");

export function writeProof(kind: string, data: any) {
  const entry = {
    id: `proof-${Date.now()}`,
    kind,
    data,
    timestamp: Date.now()
  };

  let existing: any[] = [];
  if (fs.existsSync(LOG_PATH)) {
    existing = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
  }

  existing.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(existing, null, 2));
}
