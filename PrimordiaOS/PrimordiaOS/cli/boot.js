// cli/boot.js
// PrimordiaOS Boot Sequence

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, "..", "modules");
const BOOT_PATH = path.join(__dirname, "..", "boot.json");

// Discover modules by scanning /modules directory
function discoverModules() {
  const modules = {};

  if (!fs.existsSync(MODULES_DIR)) {
    console.log("No modules directory found.");
    return modules;
  }

  const dirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const manifestPath = path.join(MODULES_DIR, dir.name, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      console.log(`Skipping ${dir.name}: no manifest.json`);
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    modules[manifest.name] = {
      dir: dir.name,
      entry: manifest.entry,
      commands: manifest.commands
    };
  }

  return modules;
}

// Load module dynamically
async function loadModule(info) {
  const absPath = path.resolve(MODULES_DIR, info.dir, info.entry);
  const fileUrl = pathToFileURL(absPath);
  return await import(fileUrl.href);
}

// Boot sequence runner
async function boot() {
  console.log("PrimordiaOS boot sequence:");

  if (!fs.existsSync(BOOT_PATH)) {
    console.log("boot.json not found. Nothing to boot.");
    return;
  }

  const bootConfig = JSON.parse(fs.readFileSync(BOOT_PATH, "utf8"));
  const sequence = bootConfig.sequence || [];

  const registry = discoverModules();

  if (sequence.length === 0) {
    console.log("Boot sequence is empty.");
    return;
  }

  for (const name of sequence) {
    const info = registry[name];

    if (!info) {
      console.log(`  [SKIP] ${name} (module not found)`);
      continue;
    }

    console.log(`  [START] ${name}`);

    try {
      const mod = await loadModule(info);

      if (typeof mod.start === "function") {
        await mod.start();
      } else {
        console.log(`    ${name} has no start() function`);
      }
    } catch (err) {
      console.log(`    ERROR starting ${name}:`, err.message);
    }
  }

  console.log("Boot sequence complete.");
}

boot().catch(err => {
  console.error("Boot error:", err);
});
