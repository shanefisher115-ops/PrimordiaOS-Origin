"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startActionExecutor = startActionExecutor;
const event_bus_1 = require("./event-bus");
const unreal_bridge_1 = require("../../bridges/unreal/unreal-bridge");
function startActionExecutor() {
    (0, event_bus_1.registerHandler)(async (event) => {
        if (event.type === "world-command") {
            const cmd = event.payload.command;
            if (cmd.target === "unreal") {
                await (0, unreal_bridge_1.sendToUnreal)(cmd);
                await (0, event_bus_1.emit)({
                    id: `unreal-ack-${Date.now()}`,
                    type: "unreal",
                    source: "unreal-bridge",
                    payload: { ok: true, cmd },
                    timestamp: Date.now(),
                });
            }
            if (cmd.target === "cli") {
                // TODO: spawn child process, run script, etc.
            }
        }
    });
}
