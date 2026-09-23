/**
 * PrimordiaOS Manifest Loader
 * ---------------------------
 * Loads and validates manifest.json
 */

const fs = require("fs");
const path = require("path");

function loadManifest() {
  const manifestPath = path.join(process.cwd(), "primordiaos", "manifest.json");

  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    console.log("→ Manifest Loaded:", manifest.name, manifest.version);
    return manifest;

  } catch (err) {
    console.error("❌ Failed to load manifest:", err);
    process.exit(1);
  }
}

module.exports = loadManifest;
