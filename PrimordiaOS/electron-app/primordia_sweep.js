/**
 * PRIMORDIAOS GIANT FILE SWEEP (SAFE VERSION)
 * ---------------------------------------------------------
 * This script:
 * - Creates PrimordiaOS master root
 * - Scans your entire user directory
 * - Copies all files into system-intake
 * - Classifies files into PrimordiaOS modules
 * - Builds module folders
 * - Writes a full report
 *
 * SAFE VERSION: Copies files only. Does NOT delete or move originals.
 */

const fs = require("fs");
const path = require("path");
const fsp = fs.promises;

// === CONFIG =========================================================

const USER_DIR = process.env.USERPROFILE || process.env.HOME;
const ROOT = "C:/PrimordiaOS_Master";
const INTAKE = `${ROOT}/system-intake`;

const MODULES = {
  cockpit: ["jsx", "tsx", "js", "html", "css", "json"],
  "plugin-os": ["js", "ts", "mjs", "cjs"],
  kernel: ["js", "ts"],
  moneyplughub: ["json", "yaml", "yml"],
  osmium: ["db", "sqlite", "sql"],
  "simulation-bridge": ["uasset", "umap"],
  "unreal-simulation": ["uproject", "cpp", "h"],
  archive: ["zip", "rar", "7z", "old", "bak"]
};

// === HELPERS ========================================================

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function getExt(file) {
  return file.split(".").pop().toLowerCase();
}

function classify(ext) {
  for (const [module, exts] of Object.entries(MODULES)) {
    if (exts.includes(ext)) return module;
  }
  return "archive";
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  return fsp.copyFile(src, dest);
}

// === MAIN ===========================================================

(async () => {
  console.log("🚀 PrimordiaOS Giant File Sweep Starting…");

  // Create root + module folders
  await ensureDir(ROOT);
  await ensureDir(INTAKE);

  for (const module of Object.keys(MODULES)) {
    await ensureDir(`${ROOT}/${module}`);
  }

  // Scan user directory
  console.log("📂 Scanning user directory:", USER_DIR);

  const report = [];

  async function sweep(dir) {
    const items = await fsp.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const full = path.join(dir, item.name);

      try {
        if (item.isDirectory()) {
          await sweep(full);
        } else {
          const ext = getExt(item.name);
          const module = classify(ext);

          const intakeDest = `${INTAKE}/${item.name}`;
          const moduleDest = `${ROOT}/${module}/${item.name}`;

          await copyFile(full, intakeDest);
          await copyFile(full, moduleDest);

          report.push({
            file: full,
            ext,
            module,
            intakeDest,
            moduleDest
          });

          console.log(`📦 ${item.name} → ${module}`);
        }
      } catch (err) {
        console.log("⚠️ Error:", err.message);
      }
    }
  }

  await sweep(USER_DIR);

  // Write report
  const reportPath = `${ROOT}/sweep_report.json`;
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log("✅ Sweep complete!");
  console.log("📄 Report:", reportPath);
})();
