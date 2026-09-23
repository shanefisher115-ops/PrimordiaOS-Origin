// api/server.ts

import express from "express";
import { runSovereignTick } from "../autonomy/sovereign-scheduler";
import { getGlobalState } from "../autonomy/global-state";
import { executeAgentTask } from "../autonomy/agent-executor";
import { sendUnrealCommand } from "../bridge/unreal-command-bridge";
import { writeProof } from "../diagnostics/proof-log";

const app = express();
app.use(express.json());

app.get("/state", (req, res) => {
  res.json(getGlobalState());
});

app.post("/tick", (req, res) => {
  res.json(runSovereignTick());
});

app.post("/agent", (req, res) => {
  const { agentId, kind, payload } = req.body;

  if (!agentId || !kind) {
    return res.status(400).json({ error: "agentId and kind required" });
  }

  const result = executeAgentTask({
    id: `task-${Date.now()}`,
    agentId,
    kind,
    payload: payload || {}
  });

  res.json(result);
});

app.post("/unreal", (req, res) => {
  const { type, payload } = req.body;

  if (!type) {
    return res.status(400).json({ error: "type required" });
  }

  sendUnrealCommand({ type, payload: payload || {} });
  res.json({ sent: true });
});

app.post("/proof", (req, res) => {
  const { kind, data } = req.body;

  if (!kind) {
    return res.status(400).json({ error: "kind required" });
  }

  writeProof(kind, data || {});
  res.json({ written: true });
});

const PORT = 7070;
app.listen(PORT, () => {
  console.log(`[API] PrimordiaOS HTTP API running on port ${PORT}`);
});
