"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScoringEngine = startScoringEngine;
exports.getScores = getScores;
const event_bus_1 = require("./event-bus");
const scores = new Map();
function updateScore(key, delta) {
    const existing = scores.get(key) ?? { id: key, score: 0, lastUpdated: 0 };
    const next = {
        ...existing,
        score: existing.score + delta,
        lastUpdated: Date.now(),
    };
    scores.set(key, next);
}
function startScoringEngine() {
    (0, event_bus_1.registerHandler)(async (event) => {
        if (event.type === "signal") {
            updateScore(event.payload.key, event.payload.weight ?? 1);
        }
        if (event.type === "unreal") {
            updateScore("unreal-bridge-health", event.payload.ok ? 1 : -5);
        }
        if (event.type === "scheduler" && event.payload.task.type === "review") {
            // could emit review tasks based on scores here
        }
    });
}
function getScores() {
    return Array.from(scores.values());
}
