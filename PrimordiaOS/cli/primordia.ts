#!/usr/bin/env node

// cli/primordia.ts

import { runSovereignTick } from "../autonomy/sovereign-scheduler";
import { getGlobalState } from "../autonomy/global-state";
import { executeAgentTask } from "../autonomy/agent-executor";
import { sendUnrealCommand } from "../bridge/unreal-command-bridge";
import { writeProof } from "../diagnostics/proof-log";

const args = process.argv.slice(2);
const cmd = args[0];

function help() {
  console.log(`
PrimordiaOS CLI Commands

  primordia tick
      Run a sovereign tick manually.

  primordia state
      Print the current global autonomy state.

  primordia agent <agentId> <taskKind> <payloadJson>
      Execute an agent task.

  primordia unreal <type> <payloadJson>
      Send a command to Unreal Engine.

  primordia proof <kind> <dataJson>
      Write a proof-log entry.

  primordia help
      Show this help menu.
`);
}

async function main() {
  switch (cmd) {
    case "tick": {
      const result = runSovereignTick();
      console.log("[SOVEREIGN TICK RESULT]");
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "state": {
      const state = getGlobalState();
      console.log("[GLOBAL STATE]");
      console.log(JSON.stringify(state, null, 2));
      break;
    }

    case "agent": {
      const agentId = args[1];
      const kind = args[2];
      const payloadRaw = args[3] || "{}";

      if (!agentId || !kind) {
        console.error("Usage: primordia agent <agentId> <taskKind> <payloadJson>");
        return;
      }

      let payload;
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        console.error("Invalid JSON payload");
        return;
      }

      const result = executeAgentTask({
        id: `task-${Date.now()}`,
        agentId,
        kind,
        payload,
      });

      console.log("[AGENT RESULT]");
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "unreal": {
      const type = args[1];
      const payloadRaw = args[2] || "{}";

      if (!type) {
        console.error("Usage: primordia unreal <type> <payloadJson>");
        return;
      }

      let payload;
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        console.error("Invalid JSON payload");
        return;
      }

      sendUnrealCommand({ type, payload });

      console.log("[UNREAL COMMAND SENT]");
      console.log(JSON.stringify({ type, payload }, null, 2));
      break;
    }

    case "proof": {
      const kind = args[1];
      const dataRaw = args[2] || "{}";

      if (!kind) {
        console.error("Usage: primordia proof <kind> <dataJson>");
        return;
      }

      let data;
      try {
        data = JSON.parse(dataRaw);
      } catch {
        console.error("Invalid JSON payload");
        return;
      }

      writeProof(kind, data);

      console.log("[PROOF LOG WRITTEN]");
      break;
    }

    case "help":
    default:
      help();
      break;
  }
}

main();
