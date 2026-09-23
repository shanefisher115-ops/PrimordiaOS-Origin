#!/usr/bin/env node

const AgentRegistry = require("./agent-registry");
const loadManifest = require("./manifest-loader");
const { spawn } = require("child_process");
const path = require("path");

const ROOT = process.cwd();

function startProcess(label, command, args, options = {}) {
  const proc = spawn(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...options.env },
    shell: true
  });

  proc.stdout.on("data", data => {
    process.stdout.write(`[${label}] ${data}`);
  });

  proc.stderr.on("data", data => {
    process.stderr.write(`[${label} ERROR] ${data}`);
  });

  proc.on("close", code => {
    console.log(`[${label}] exited with code ${code}`);
  });

  return proc;
}

async function boot() {
  console.log("⚡ PrimordiaOS Boot Sequence Initiated");

  const manifest = loadManifest();

  console.log("→ Booting MCP Execution Engine...");
  startProcess("MCP", "node", [manifest.mcp.entry]);

  console.log("→ Booting Nexus Orchestrator...");
  startProcess("NEXUS", "node", [manifest.nexus.entry]);

  console.log("→ Mounting Realms...");
  manifest.realms.forEach(realm => {
    console.log(`→ Realm Mounted: ${realm.name}`);
  });

  console.log("→ Loading Agents...");
  manifest.agents.forEach(agentPath => {
    AgentRegistry.loadAgent(agentPath);
  });

  console.log("→ Initializing Agents...");
  await AgentRegistry.initAll();

  process.on("SIGINT", async () => {
    console.log("\n⚡ Shutting down PrimordiaOS...");
    await AgentRegistry.shutdownAll();
    process.exit(0);
  });

  console.log("⚡ PrimordiaOS Boot Complete");
}

boot();
