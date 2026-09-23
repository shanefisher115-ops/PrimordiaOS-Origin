// moneyplughub/index.js
// PrimordiaOS Money Engine

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve correct directory (fixes uppercase/lowercase issues)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const LOG_PATH = path.join(__dirname, "money-engine.log");
const STATE_PATH = path.join(__dirname, "state.json");

// Default state
let state = {
  running: false,
  started_at: null,
  events: []
};

// Load previous state if exists
if (fs.existsSync(STATE_PATH)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (err) {
    console.error("Money Engine: Failed to load state.json", err);
  }
}

// Utility: write logs
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(message);
}

// Utility: save state
function saveState() {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// Start engine
export function start() {
  if (state.running) {
    log("Money Engine already running.");
    return;
  }

  state.running = true;
  state.started_at = new Date().toISOString();
  saveState();

  log("Money Engine STARTED.");
  log("Tracking referrals, clicks, conversions, and monetization events.");
}

// Stop engine
export function stop() {
  if (!state.running) {
    log("Money Engine is not running.");
    return;
  }

  state.running = false;
  saveState();

  log("Money Engine STOPPED.");
}

// Add event (optional future use)
export function addEvent(type, payload = {}) {
  const event = {
    id: Date.now(),
    type,
    payload,
    timestamp: new Date().toISOString()
  };

  state.events.push(event);
  saveState();

  log(`Money Engine Event: ${type}`);
}

// Status
export function status() {
  console.log("Money Engine Status:");
  console.log(`  running: ${state.running}`);
  console.log(`  started_at: ${state.started_at}`);
  console.log(`  events: ${state.events.length}`);
}
