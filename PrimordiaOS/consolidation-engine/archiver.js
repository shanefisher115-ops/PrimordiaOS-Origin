import fs from "node:fs";
import path from "node:path";

/**
 * Creates or updates the archival manifest for legacy and preserved assets.
 * @param {string} archiveDir 
 * @param {Array<object>} legacyItems 
 */
export function writeArchivalManifest(archiveDir, legacyItems) {
  const manifestPath = path.join(archiveDir, "manifest.json");
  const readmePath = path.join(archiveDir, "README.md");

  const manifest = {
    title: "PrimordiaOS Historical & Preserved Asset Manifest",
    archived_at: new Date().toISOString(),
    total_preserved: legacyItems.length,
    assets: legacyItems.map(item => ({
      path: item.relativePath || item.file_path,
      sizeBytes: item.sizeBytes || 0,
      classification: item.category || "legacy_snapshot"
    }))
  };

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  const readmeContent = `# PrimordiaOS Archive

This directory catalogs historical snapshots, superseded scripts, and backup manifests preserved during the Consolidation Engine execution.

## Preserved Assets
- **Total Registered**: ${legacyItems.length}
- **Manifest**: [manifest.json](./manifest.json)
- **Status**: Archived / Read-Only Reference
`;

  fs.writeFileSync(readmePath, readmeContent, "utf-8");
  return manifest;
}
