/* ============================================================
   PRIMORDIAOS AUTO-BOOTSTRAP MODULE GENERATOR
   ============================================================ */

import fs from "fs";

const BASE = "C:\\Users\\Shane\\PrimordiaOS";

const MODULES = [
  "kernel",
  "visioncore",
  "vertex",
  "generator",
  "osmium",
  "plugin-os",
  "mobile-node",
  "simulation-bridge"
];

const TEMPLATE = (name) => `/* ============================================================
   PRIMORDIAOS ${name.toUpperCase()} MODULE STUB
   ============================================================ */

import fetch from "node-fetch";

const NAME = "${name.toUpperCase()}";
const INTERVAL = 2000;

async function forwardEvent(event) {
  try {
    await fetch("http://localhost:3001/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    console.log(\`[\${NAME}] Event forwarded: \${event.type}\`);
  } catch {
    console.log(\`[\${NAME}] Failed to forward event to BUS\`);
  }
}

function start() {
  console.log(\`[\${NAME}] Online\`);
  setInterval(() => {
    forwardEvent({
      realm: NAME,
      type: "heartbeat",
      timestamp: Date.now()
    });
  }, INTERVAL);
}

start();
`;

for (const mod of MODULES) {
  const dir = `${BASE}\\${mod}`;
  const file = `${dir}\\index.js`;

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(file, TEMPLATE(mod));

  console.log(`[BOOTSTRAP] Created ${file}`);
}

console.log("\n[BOOTSTRAP] All module stubs generated.");
