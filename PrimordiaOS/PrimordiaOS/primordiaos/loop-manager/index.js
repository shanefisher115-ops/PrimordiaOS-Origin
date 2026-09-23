// primordiaos/loop-manager/index.js

import WebSocket from "ws";
import http from "http";

const BUS_WS_URL = "ws://localhost:3002";
const BUS_HTTP_HOST = "localhost";
const BUS_HTTP_PORT = 3001;

const REALM = "loop-manager";

// simple in-memory loop state
const loopState = {
  lastResultOk: true,
  loopDepth: 0,
  maxDepth: 100,
};

// --- helpers --------------------------------------------------------

function postEvent(event) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(event);

    const req = http.request(
      {
        host: BUS_HTTP_HOST,
        port: BUS_HTTP_PORT,
        path: "/event",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      res => {
        let body = "";
        res.on("data", chunk => (body += chunk));
        res.on("end", () => resolve(body || null));
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function emitTaskForRealm(targetRealm, payload) {
  return postEvent({
    realm: REALM,
    type: "task",
    data: {
      ...payload,
      targetRealm   // cockpit uses this to draw animated links
    }
  });
}

function emitError(msg) {
  return postEvent({
    realm: REALM,
    type: "error",
    data: { msg },
  });
}

function log(...args) {
  console.log("[LOOP]", ...args);
}

// --- core loop logic ------------------------------------------------

async function handleHeartbeat(event) {
  const { realm, data } = event;
  log("heartbeat from", realm, "status:", data?.status);

  if (!loopState.lastResultOk) {
    log("last result not OK, halting loop");
    await emitError("last result invalid, loop halted");
    return;
  }

  if (loopState.loopDepth >= loopState.maxDepth) {
    log("max loop depth reached, halting loop");
    await emitError("max loop depth reached");
    return;
  }

  // emit a new task to monetization-node (example target)
  loopState.loopDepth += 1;
  log("emitting task, depth =", loopState.loopDepth);

  await emitTaskForRealm("monetization-node", {
    loopDepth: loopState.loopDepth,
    reason: "heartbeat-driven loop step",
  });
}

async function handleResult(event) {
  const { realm, data } = event;
  log("result from", realm, "data:", data);

  // trivial validation for now
  const ok = !!data && data.msg && !data.error;
  loopState.lastResultOk = ok;

  if (!ok) {
    log("result invalid, marking loopState.lastResultOk = false");
    await emitError("invalid result from " + realm);
  } else {
    log("result OK, loopState.lastResultOk = true");
  }
}

async function handleError(event) {
  const { realm, data } = event;
  log("error from", realm, "data:", data);
  loopState.lastResultOk = false;
}

// --- websocket client -----------------------------------------------

function startLoopManager() {
  log("connecting to bus at", BUS_WS_URL);

  const ws = new WebSocket(BUS_WS_URL);

  ws.on("open", async () => {
    log("connected to bus");

    // optional: register this realm
    await postEvent({
      realm: REALM,
      type: "register",
      data: { role: "autonomous-loop-manager" },
    });

    log("registered realm:", REALM);
  });

  ws.on("message", async msg => {
    let event;
    try {
      event = JSON.parse(msg.toString());
    } catch (e) {
      log("invalid JSON from bus:", msg.toString());
      return;
    }

    const { realm, type } = event;
    log("event:", realm, "→", type);

    try {
      if (type === "heartbeat") {
        await handleHeartbeat(event);
      } else if (type === "result") {
        await handleResult(event);
      } else if (type === "error") {
        await handleError(event);
      }
    } catch (e) {
      log("loop handler error:", e.message);
      await emitError("loop-manager internal error: " + e.message);
    }
  });

  ws.on("close", () => {
    log("bus connection closed, retrying in 3s");
    setTimeout(startLoopManager, 3000);
  });

  ws.on("error", err => {
    log("bus connection error:", err.message);
  });
}

startLoopManager();
