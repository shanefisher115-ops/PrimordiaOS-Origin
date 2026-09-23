import fetch from "node-fetch";
import http from "http";

const NAME = "KERNEL";
const INTERVAL = 2000;
const PORT = 3000;   // match primordia.js

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

  // Register event
  forwardEvent({ realm: NAME, type: "register", status: "online", timestamp: Date.now() });

  // Heartbeat loop
  setInterval(() => {
    forwardEvent({ realm: NAME, type: "heartbeat", timestamp: Date.now() });
  }, INTERVAL);

  // Health endpoint
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`[${NAME}] Health server listening on port ${PORT}`);
  });
}

start();
