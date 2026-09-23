/* ============================================================
   PRIMORDIAOS PLUGIN-OS MODULE STUB
   ============================================================ */

import fetch from "node-fetch";

const NAME = "PLUGIN-OS";
const INTERVAL = 2000;

async function forwardEvent(event) {
  try {
    await fetch("http://localhost:3001/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    console.log(`[${NAME}] Event forwarded: ${event.type}`);
  } catch {
    console.log(`[${NAME}] Failed to forward event to BUS`);
  }
}

function start() {
  console.log(`[${NAME}] Online`);
  setInterval(() => {
    forwardEvent({
      realm: NAME,
      type: "heartbeat",
      timestamp: Date.now()
    });
  }, INTERVAL);
}

start();
