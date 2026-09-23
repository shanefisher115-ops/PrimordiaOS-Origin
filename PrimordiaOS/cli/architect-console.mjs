// ============================================================
//  PRIMORDIAOS // ARCHITECT CONSOLE
//  Sovereign CLI for Multiverse Control
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/cli/architect-console.mjs
// ============================================================

import readline from "readline";
import fetch from "node-fetch";

// Core endpoints
const SOVEREIGN_URL = "http://localhost:7000";
const NARRATIVE_URL = "http://localhost:7003";
const MONEY_URL = "http://localhost:7001";
const CINEMA_URL = "http://localhost:7002";

// ============================================================
//  BOOT BANNER
// ============================================================

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║        ✦ PRIMORDIAOS // ARCHITECT CONSOLE ✦          ║
╚══════════════════════════════════════════════════════╝

Architect, your multiverse is listening.

Commands:
  realms          → list realms
  daemons         → list daemons
  state           → show sovereign state
  cmd             → send sovereign command
  origin          → show narrative origin universe
  scenes          → list scenes
  money           → show ledger
  pulse           → show last pulse
  help            → show this help
  exit            → leave console
`);
}

// ============================================================
//  HTTP HELPERS
// ============================================================

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ============================================================
//  COMMAND HANDLERS
// ============================================================

async function handleRealms() {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  const realms = data.state.realms || {};
  console.log("✦ Realms:");
  for (const id of Object.keys(realms)) {
    const r = realms[id];
    console.log(
      `  - ${r.name} [${id}] type=${r.type} status=${r.status} capabilities=${(r.capabilities || []).join(
        ", "
      )}`
    );
  }
}

async function handleDaemons() {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  const daemons = data.state.daemons || {};
  console.log("✦ Daemons:");
  for (const name of Object.keys(daemons)) {
    const d = daemons[name];
    console.log(
      `  - ${d.name} realm=${d.realm} status=${d.status} desc=${d.description}`
    );
  }
}

async function handleState() {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  console.log("✦ Sovereign State:");
  console.dir(data.state, { depth: 3 });
}

async function handleCmd(args) {
  const [scope = "primordia", target = "core", action = "ping", ...rest] =
    args;
  let payload = {};
  if (rest.length > 0) {
    try {
      payload = JSON.parse(rest.join(" "));
    } catch {
      console.log("✦ Payload must be valid JSON. Using empty payload.");
    }
  }

  const result = await postJson(`${SOVEREIGN_URL}/primordia/command`, {
    scope,
    target,
    action,
    payload,
  });

  console.log("✦ Command result:");
  console.dir(result, { depth: 3 });
}

async function handleOrigin() {
  const data = await getJson(`${NARRATIVE_URL}/state`);
  console.log("✦ Origin Universe:");
  console.dir(data.state.originUniverse, { depth: 3 });
}

async function handleScenes() {
  const data = await getJson(`${NARRATIVE_URL}/state`);
  console.log("✦ Scenes:");
  for (const s of data.state.scenes || []) {
    console.log(
      `  - ${s.id}: ${s.title} (mood=${s.mood}, intensity=${s.intensity})`
    );
  }
}

async function handleMoney() {
  const data = await getJson(`${MONEY_URL}/ledger`);
  console.log("✦ MoneyPlugHub Ledger:");
  console.dir(data.ledger, { depth: 3 });
}

async function handlePulse() {
  const data = await getJson(`${SOVEREIGN_URL}/primordia/state`);
  const pulses = data.state.pulses || [];
  const last = pulses[pulses.length - 1];
  if (!last) {
    console.log("✦ No pulses recorded yet.");
    return;
  }
  console.log(
    `✦ Last sovereign pulse: ts=${new Date(last.ts).toISOString()} energy=${
      last.energy ?? "n/a"
    }`
  );
}

function handleHelp() {
  printBanner();
}

// ============================================================
//  COMMAND DISPATCH
// ============================================================

async function dispatch(line) {
  const [cmd, ...args] = line.trim().split(/\s+/);

  if (!cmd) return;

  switch (cmd.toLowerCase()) {
    case "realms":
      await handleRealms();
      break;
    case "daemons":
      await handleDaemons();
      break;
    case "state":
      await handleState();
      break;
    case "cmd":
      await handleCmd(args);
      break;
    case "origin":
      await handleOrigin();
      break;
    case "scenes":
      await handleScenes();
      break;
    case "money":
      await handleMoney();
      break;
    case "pulse":
      await handlePulse();
      break;
    case "help":
      handleHelp();
      break;
    case "exit":
      console.log("✦ Architect console closing. Multiverse remains online.");
      process.exit(0);
    default:
      console.log(`✦ Unknown command: ${cmd}`);
      handleHelp();
  }
}

// ============================================================
//  MAIN LOOP
// ============================================================

async function main() {
  printBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "PRIMORDIA> ",
  });

  rl.prompt();

  rl.on("line", async (line) => {
    try {
      await dispatch(line);
    } catch (err) {
      console.error("✦ Error executing command:", err);
    }
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("✦ Architect console terminated.");
    process.exit(0);
  });
}

main();
