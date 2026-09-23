import fs from "node:fs";
import path from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".venv",
  ".cache",
  ".gradle",
  "DerivedDataCache",
  "Intermediate",
  "Saved",
  "dist",
  "out",
  ".antigravity-ide",
  ".gemini"
]);

/**
 * Recursively scans a root directory for all code and asset files.
 * @param {string} rootDir 
 * @param {number} maxDepth 
 * @returns {Array<{relativePath: string, absolutePath: string, sizeBytes: number, ext: string, isDirectory: boolean}>}
 */
export function scanWorkspace(rootDir, maxDepth = 6) {
  const results = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

      if (entry.isDirectory()) {
        results.push({
          relativePath,
          absolutePath: fullPath,
          sizeBytes: 0,
          ext: "",
          isDirectory: true
        });
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          results.push({
            relativePath,
            absolutePath: fullPath,
            sizeBytes: stat.size,
            ext: path.extname(entry.name).toLowerCase(),
            isDirectory: false
          });
        } catch {
          // Ignore unreadable files
        }
      }
    }
  }

  walk(rootDir, 0);
  return results;
}
