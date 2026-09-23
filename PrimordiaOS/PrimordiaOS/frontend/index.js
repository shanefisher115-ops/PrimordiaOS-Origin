import http from "http";

console.log("[COCKPIT] Online");

// ------------------------------------------------------
// Cockpit State
// ------------------------------------------------------
const cockpitState = {
  panels: {
    eventBus: []
  }
};

// ------------------------------------------------------
// HTTP Server
// ------------------------------------------------------
const server = http.createServer((req, res) => {

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // Return full cockpit state
  if (req.method === "GET" && req.url === "/state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(cockpitState));
  }

  // Accept updates from Runtime Orchestrator
  if (req.method === "POST" && req.url === "/update") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        const update = JSON.parse(body);

        if (update.panels?.eventBus) {
          cockpitState.panels.eventBus.push(...update.panels.eventBus);
          console.log("[COCKPIT] EventBus updated");
        }

        res.writeHead(200);
        res.end("ok");
      } catch (err) {
        console.log("[COCKPIT] Failed to parse update");
        res.writeHead(400);
        res.end("bad request");
      }
    });
    return;
  }

  // Default
  res.writeHead(404);
  res.end("Not Found");
});

// ------------------------------------------------------
// Start Cockpit Server
// ------------------------------------------------------
server.listen(3800, () => {
  console.log("[COCKPIT] Cockpit module running on port 3800");
});
