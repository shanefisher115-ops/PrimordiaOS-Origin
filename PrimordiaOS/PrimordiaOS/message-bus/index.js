// message-bus/index.js
const express = require("express");
const cors = require("cors");

// Forwarder that sends events into PrimordiaOS Kernel + Cockpit
const forwardEvent = require("./forwardEvent.js");

// Google Assistant webhook route
const voiceWebhook = require("./voice-webhook.cjs");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, service: "PrimordiaOS Message Bus" });
});

// Google Assistant → PrimordiaOS webhook
app.use("/webhook", voiceWebhook);

// Generic event forwarder endpoint (optional)
app.post("/events", (req, res) => {
  const event = req.body;

  if (!event) {
    return res.status(400).json({ error: "Missing event body" });
  }

  forwardEvent(event);
  res.json({ ok: true });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[BUS] PrimordiaOS Message Bus Online on port ${PORT}`);
});
