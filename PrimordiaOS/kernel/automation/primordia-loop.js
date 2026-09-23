"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPrimordiaAutomation = startPrimordiaAutomation;
const scheduler_1 = require("./scheduler");
const scoring_engine_1 = require("./scoring-engine");
const action_executor_1 = require("./action-executor");
const unreal_bridge_1 = require("../../bridges/unreal/unreal-bridge");
async function startPrimordiaAutomation() {
    (0, scoring_engine_1.startScoringEngine)();
    (0, action_executor_1.startActionExecutor)();
    (0, scheduler_1.startScheduler)();
    (0, unreal_bridge_1.startUnrealBridge)();
    // optional: heartbeat
    console.log("[PrimordiaOS] Automation layer online.");
}
