import fs from "fs";
import path from "path";

const IGNORE = [
  "node_modules",
  ".git",
  ".venv",
  "archive",
  ".cache",
  ".gradle",
  "DerivedDataCache",
  "Intermediate",
  "Saved",
  "dist",
  "out",
  ".antigravity-ide",
  ".gemini"
];

export async function scanWorkspace(
  root = process.cwd()
): Promise<string[]> {
  const results: string[] = [];

  function walk(dir: string) {
    let items: string[];
    try {
      items = fs.readdirSync(dir);
    } catch {
      return;
    }

    for (const item of items) {
      if (IGNORE.includes(item)) continue;

      const full = path.join(dir, item);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(full);
      } else {
        results.push(full);
      }
    }
  }

  walk(root);
  return results;
}
