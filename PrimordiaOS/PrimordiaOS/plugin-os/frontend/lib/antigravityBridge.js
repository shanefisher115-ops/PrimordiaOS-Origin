"use strict";
// ============================================================
//   ANTIGRAVITY BRIDGE — PURL ↔ Antigravity Binding
// ============================================================
//
//   Binds Antigravity intents into the PURL routing table
//   at runtime. Called during Shell boot after startPURL().
//
//   This bridge makes Antigravity a runtime target:
//   when a command runs through HCL → PURL → engine,
//   Antigravity can render the output.
//
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANTIGRAVITY_INTENTS = void 0;
exports.bindAntigravityToPURL = bindAntigravityToPURL;
exports.unbindAntigravityFromPURL = unbindAntigravityFromPURL;
exports.isAntigravityBound = isAntigravityBound;
exports.getAntigravityIntents = getAntigravityIntents;
const engines_1 = require("./engines");
const antigravityEngine = __importStar(require("./engines/antigravityEngine"));
// ─── Constants ──────────────────────────────────────────────
exports.ANTIGRAVITY_INTENTS = [
    "simulation.render",
    "world.project",
    "agent.visualize",
    "memory.spatial.map",
    "scene.generate",
];
// ─── State ──────────────────────────────────────────────────
let bound = false;
// ─── Bind ───────────────────────────────────────────────────
function bindAntigravityToPURL() {
    if (bound)
        return;
    for (const intent of exports.ANTIGRAVITY_INTENTS) {
        engines_1.ENGINE_MAP[intent] = antigravityEngine;
    }
    bound = true;
}
// ─── Unbind ─────────────────────────────────────────────────
function unbindAntigravityFromPURL() {
    if (!bound)
        return;
    for (const intent of exports.ANTIGRAVITY_INTENTS) {
        delete engines_1.ENGINE_MAP[intent];
    }
    bound = false;
}
// ─── Status ─────────────────────────────────────────────────
function isAntigravityBound() {
    return bound;
}
// ─── Intent List ────────────────────────────────────────────
function getAntigravityIntents() {
    return exports.ANTIGRAVITY_INTENTS;
}
