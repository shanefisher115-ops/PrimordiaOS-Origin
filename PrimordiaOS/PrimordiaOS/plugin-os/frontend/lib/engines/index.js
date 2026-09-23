"use strict";
// ============================================================
//   OVERMIND ENGINE ROUTING TABLE
// ============================================================
//
//   Maps intent strings to their target engine modules.
//   PURL uses this to route commands to the correct engine.
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
exports.ENGINE_MAP = void 0;
exports.getEngineName = getEngineName;
exports.getAvailableIntents = getAvailableIntents;
exports.getEngineCount = getEngineCount;
const selfModEngine = __importStar(require("./selfModEngine"));
const replicatorEngine = __importStar(require("./replicatorEngine"));
const swarmCoreEngine = __importStar(require("./swarmCoreEngine"));
const temporalEngine = __importStar(require("./temporalEngine"));
const cloudNodeEngine = __importStar(require("./cloudNodeEngine"));
const antigravityEngine = __importStar(require("./antigravityEngine"));
// ─── Routing Table ──────────────────────────────────────────
exports.ENGINE_MAP = {
    // Simulation
    "simulation.run": swarmCoreEngine,
    "simulation.step": swarmCoreEngine,
    // World
    "world.update": temporalEngine,
    "world.query": temporalEngine,
    // Agents
    "agent.spawn": replicatorEngine,
    "agent.modify": selfModEngine,
    "agent.inspect": selfModEngine,
    // Cloud
    "cloud.exec": cloudNodeEngine,
    "cloud.deploy": cloudNodeEngine,
    // Antigravity — Visual Cognition
    "simulation.render": antigravityEngine,
    "world.project": antigravityEngine,
    "agent.visualize": antigravityEngine,
    "memory.spatial.map": antigravityEngine,
    "scene.generate": antigravityEngine,
};
// ─── Engine Name Resolver ───────────────────────────────────
function getEngineName(intent) {
    const engine = exports.ENGINE_MAP[intent];
    if (!engine)
        return null;
    // Exact intent mapping for Antigravity intents
    const antigravityIntents = [
        "simulation.render", "world.project", "agent.visualize",
        "memory.spatial.map", "scene.generate",
    ];
    if (antigravityIntents.includes(intent))
        return "antigravityEngine";
    // Derive name from the module's execute return value convention
    // or from the map key prefix
    const prefix = intent.split(".")[0];
    const nameMap = {
        simulation: "swarmCoreEngine",
        world: "temporalEngine",
        agent: intent === "agent.spawn" ? "replicatorEngine" : "selfModEngine",
        cloud: "cloudNodeEngine",
    };
    return nameMap[prefix] ?? null;
}
// ─── Available Intents ──────────────────────────────────────
function getAvailableIntents() {
    return Object.keys(exports.ENGINE_MAP);
}
// ─── Engine Count ───────────────────────────────────────────
function getEngineCount() {
    const unique = new Set(Object.values(exports.ENGINE_MAP));
    return unique.size;
}
