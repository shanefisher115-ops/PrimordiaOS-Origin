// cli/primordia.js
// PrimordiaOS CLI

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, "..", "modules");

// Auto-discovery
function discoverModules() {
  const modules = {};

  if (!fs.existsSync(MODULES_DIR)) return modules;

  const dirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true });

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const manifestPath = path.join(MODULES_DIR, dir.name, "manifest.json");

    if (!fs.existsSync(manifestPath)) continue;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    modules[manifest.name] = {
      dir: dir.name,
      entry: manifest.entry,
      commands: manifest.commands
    };
  }

  return modules;
}

const registry = discoverModules();

// Load module dynamically
async function loadModule(moduleName) {
  const info = registry[moduleName];
  if (!info) {
    console.log(`Module not found: ${moduleName}`);
    return null;
  }

  const absPath = path.resolve(MODULES_DIR, info.dir, info.entry);
  const fileUrl = pathToFileURL(absPath);

  return await import(fileUrl.href);
}

// CLI commands
function printHelp() {
  console.log("PrimordiaOS CLI Commands:");
  console.log("  primordia boot");
  console.log("  primordia start <module>");
  console.log("  primordia stop <module>");
  console.log("  primordia status <module>");
  console.log("  primordia modules");
  console.log("  primordia <module> <command>");
}

async function main() {
  const [, , cmd, arg1] = process.argv;

  if (!cmd) {
    printHelp();
    return;
  }

  if (cmd === "boot") {
    const bootPath = new URL("./boot.js", import.meta.url);
    await import(bootPath.href);
    return;
  }

  if (cmd === "modules") {
    console.log("Discovered modules:");
    for (const name of Object.keys(registry)) {
      console.log(`  ${name}`);
    }
    return;
  }

  if (cmd === "start" || cmd === "stop" || cmd === "status") {
    if (!arg1) {
      console.log(`Usage: primordia ${cmd} <module>`);
      return;
    }

    const mod = await loadModule(arg1);
    if (!mod) return;

    if (typeof mod[cmd] === "function") {
      await mod[cmd]();
    } else {
      console.log(`${arg1} does not implement ${cmd}()`);
    }

    return;
  }

  // direct module command
  if (registry[cmd]) {
    const mod = await loadModule(cmd);

    if (!arg1) {
      console.log(`Commands for ${cmd}: ${registry[cmd].commands.join(", ")}`);
      return;
    }

    if (typeof mod[arg1] === "function") {
      await mod[arg1]();
    } else {
      console.log(`${cmd} does not implement ${arg1}()`);
    }

    return;
  }

  console.log(`Unknown command: ${cmd}`);
  printHelp();
}

main().catch(err => {
  console.error("PrimordiaOS CLI error:", err);
});
