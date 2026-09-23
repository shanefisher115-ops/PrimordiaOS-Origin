/* ============================================================
   PRIMORDIAOS MESSAGE BUS
   ============================================================ */

import http from "http";
import { EventEmitter } from "events";

const bus = new EventEmitter();

// ============================================================
// REALM REGISTRATION
// ============================================================

const realms = new Set();

bus.on("register", (realm) => {
  if (!realms.has(realm)) {
    realms.add(realm);
    console.log(`[BUS] Registered realm: ${realm}`);
  }
});

// ============================================================
// EVENT ROUTING
// ============================================================

bus.on("event", (event) => {
  console.log(`[BUS] Event from ${event.realm}: ${event.type}`);
  forwardToCockpit(event);
});

// ============================================================
// FORWARD EVENTS TO COCKPIT
// ============================================================

function forwardToCockpit(event) {
  const data = JSON.stringify({
    panels: {
      eventBus: [event]
    }
  });

  const req = http.request(
    {
      hostname: "127.0.0.1",
      port: 3800,
      path: "/api/update",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    },
    res => {}
  );

  req.on("error", () => {
    console.log("[BUS] Failed to forward event to Cockpit");
  });

  req.write(data);
  req.end();
}

// ============================================================
// HEALTH ENDPOINT
// ============================================================

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  res.writeHead(404);
  res.end();
});

server.listen(3001, () => {
  console.log("[BUS] Message Bus Online");
});

export default bus;
