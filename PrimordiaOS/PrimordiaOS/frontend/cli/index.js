/* ============================================================
   PRIMORDIAOS COCKPIT CLI — FULL FILE
   ============================================================

   Purpose:
   Provide a terminal interface to test the entire PrimordiaOS
   cockpit signal pipeline.

   Flow:
   CLI → Signal Matrix → EventBus → Command Router → Runtime → DB
*/

import readline from "readline";
import signals from "../signals/matrix.js";

// ============================================================
//   EMERALD / VIOLET LOGGING
// ============================================================
function logEmerald(message, data = null) {
  console.log(`\x1b[38;2;0;255;180m◆ COCKPIT CLI — ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logViolet(message, data = null) {
  console.log(`\x1b[38;2;180;0;255m◇ COCKPIT CLI — ${message}\x1b[0m`);
  if (data) console.log(data);
}

// ============================================================
//   CLI SETUP
// ============================================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

logEmerald("PrimordiaOS Cockpit CLI Online");
console.log("--------------------------------------------------");
console.log("Commands:");
console.log("  key <value>            → keyboard signal");
console.log("  click <id>             → UI click");
console.log("  mode <name>            → switch cockpit mode");
console.log("  realm <name>           → switch realm");
console.log("  agent <name> <event>   → agent signal");
console.log("  emit <type> <json>     → generic signal");
console.log("  exit                   → quit");
console.log("--------------------------------------------------");

// ============================================================
//   COMMAND PARSER
// ============================================================
async function handleInput(line) {
  const parts = line.trim().split(" ");
  const cmd = parts[0];

  try {
    switch (cmd) {
      // --------------------------------------------------------
      // Keyboard
      // --------------------------------------------------------
      case "key": {
        const key = parts[1];
        await signals.handleKeyPress(key);
        break;
      }

      // --------------------------------------------------------
      // UI Click
      // --------------------------------------------------------
      case "click": {
        const id = parts[1];
        await signals.handleUIClick(id);
        break;
      }

      // --------------------------------------------------------
      // Mode Switch
      // --------------------------------------------------------
      case "mode": {
        const mode = parts[1];
        await signals.handleModeSwitch(mode);
        break;
      }

      // --------------------------------------------------------
      // Realm Switch
      // --------------------------------------------------------
      case "realm": {
        const realm = parts[1];
        await signals.handleRealmSwitch(realm);
        break;
      }

      // --------------------------------------------------------
      // Agent Signal
      // --------------------------------------------------------
      case "agent": {
        const agent = parts[1];
        const event = parts[2];
        await signals.handleAgentSignal(agent, event);
        break;
      }

      // --------------------------------------------------------
      // Generic Signal
      // --------------------------------------------------------
      case "emit": {
        const type = parts[1];
        const json = parts.slice(2).join(" ");
        let payload = {};

        try {
          payload = json ? JSON.parse(json) : {};
        } catch {
          logViolet("Invalid JSON payload");
        }

        await signals.emitSignal(type, payload);
        break;
      }

      // --------------------------------------------------------
      // Exit
      // --------------------------------------------------------
      case "exit":
        logEmerald("Shutting down Cockpit CLI");
        process.exit(0);

      // --------------------------------------------------------
      // Unknown
      // --------------------------------------------------------
      default:
        logViolet("Unknown command", { cmd });
    }
  } catch (err) {
    logViolet("CLI error", { error: err.message });
  }
}

// ============================================================
//   INPUT LOOP
// ============================================================
rl.on("line", handleInput);
