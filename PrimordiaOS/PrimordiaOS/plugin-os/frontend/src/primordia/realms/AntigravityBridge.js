"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeToAntigravity = routeToAntigravity;
const AntigravityEngine_1 = require("./AntigravityEngine");
const ANTIGRAVITY_MAP = {
    'simulation.render': 'renderSimulation',
    'world.project': 'projectWorldModel',
    'agent.visualize': 'visualizeAgent',
    'memory.spatial.map': 'renderSpatialMemory',
    'scene.generate': 'generateScene'
};
async function routeToAntigravity(intent, payload) {
    if (!(intent in ANTIGRAVITY_MAP)) {
        return { status: 'ERROR', message: 'Unknown render intent' };
    }
    const action = ANTIGRAVITY_MAP[intent];
    return AntigravityEngine_1.AntigravityEngine[action](payload);
}
