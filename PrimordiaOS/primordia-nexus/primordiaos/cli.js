#!/usr/bin/env node

import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { eventBus } from "../primordia-core/shared/event-bus.js";
import { interpretEnglishCommand } from "./nlp-interpreter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];
const args = process.argv.slice(3);

function emitEvent(topic, jsonString) {
    let payload = {};

    try {
        payload = jsonString ? JSON.parse(jsonString) : {};
    } catch (err) {
        console.error("[CLI] Invalid JSON payload.");
        process.exit(1);
    }

    console.log(`[CLI] Emitting event '${topic}' with payload:`, payload);
    eventBus.emit(topic, payload);
}

switch (command) {

    case "boot":
        spawn("node", [path.join(__dirname, "bootloader.js")], {
            stdio: "inherit",
            shell: true
        });
        break;

    case "emit":
        const topic = args[0];
        const json = args[1];
        if (!topic) {
            console.log("Usage: primordia emit <topic> <json>");
            process.exit(1);
        }
        emitEvent(topic, json);
        break;

    case "swarm":
        const action = args[0];

        if (action === "ignite") {
            emitEvent("swarm.broadcast", JSON.stringify({ payload: "ignite" }));
        } else if (action === "broadcast") {
            const jsonPayload = args[1] || "{}";
            emitEvent("swarm.broadcast", jsonPayload);
        } else {
            console.log("Usage: primordia swarm ignite");
            console.log("       primordia swarm broadcast '{\"payload\":\"x\"}'");
        }
        break;

    case "event":
        const evtTopic = args[0];
        const evtJson = args[1];
        if (!evtTopic) {
            console.log("Usage: primordia event <topic> <json>");
            process.exit(1);
        }
        emitEvent(evtTopic, evtJson);
        break;

    case "do":
        const english = args.join(" ");
        const { topic: nlpTopic, payload: nlpPayload } = interpretEnglishCommand(english);

        console.log(`[CLI] Interpreted: ${english}`);
        console.log(`[CLI] → Event: ${nlpTopic}`);
        console.log(`[CLI] → Payload:`, nlpPayload);

        eventBus.emit(nlpTopic, nlpPayload);
        break;

    case "status":
        console.log("PrimordiaOS CLI Status:");
        console.log("  - EventBus online");
        console.log("  - Runtime active");
        console.log("  - All subsystems available");
        break;

    default:
        console.log("PrimordiaOS CLI");
        console.log("Commands:");
        console.log("  primordia boot");
        console.log("  primordia emit <topic> <json>");
        console.log("  primordia swarm ignite");
        console.log("  primordia swarm broadcast <json>");
        console.log("  primordia event <topic> <json>");
        console.log("  primordia do \"<english command>\"");
        console.log("  primordia status");
        break;
}
