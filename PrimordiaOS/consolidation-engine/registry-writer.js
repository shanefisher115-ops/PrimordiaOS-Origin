import fs from "node:fs";
import path from "node:path";

/**
 * Writes the classified module entries to the canonical registry.json file.
 * @param {string} outputPath
 * @param {Array<object>} modules
 */
export function writeRegistry(outputPath, modules) {
  const registryData = {
    system: "PrimordiaOS Unified Module Registry",
    generated_at: new Date().toISOString(),
    total_modules: modules.length,
    modules: modules.map(m => ({
      name: m.name,
      category: m.category,
      realm: m.realm,
      dependencies: m.dependencies || [],
      version: m.version || "1.0.0",
      status: m.status || "active",
      sovereignty_tier: m.sovereignty_tier ?? 3,
      file_path: m.file_path
    }))
  };

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(registryData, null, 2), "utf-8");
  return registryData;
}
