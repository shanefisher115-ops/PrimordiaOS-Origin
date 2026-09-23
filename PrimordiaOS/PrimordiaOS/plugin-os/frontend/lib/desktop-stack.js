"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRuntimeSnapshot = buildRuntimeSnapshot;
exports.handleVectorize = handleVectorize;
exports.handleGemini = handleGemini;
exports.handleUnreal = handleUnreal;
exports.handleVisionCore = handleVisionCore;
exports.handleGenerator = handleGenerator;
exports.handlePulse = handlePulse;
const primordia_1 = require("@/lib/primordia");
const registry = (0, primordia_1.normalizeAppletRegistry)(primordia_1.sampleSpannerRegistry);
function nowIso() {
    return new Date().toISOString();
}
function makeId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
function searchRegistry(query) {
    const needle = query.trim().toLowerCase();
    if (!needle)
        return registry.slice(0, 5);
    return registry.filter((item) => {
        const haystack = [item.name, item.description, item.runtimeType, item.realm, ...(item.tags ?? [])]
            .join(" ")
            .toLowerCase();
        return haystack.includes(needle);
    });
}
function buildRuntimeSnapshot(appVersion, platform, isDev, pulseState) {
    return {
        appVersion,
        platform,
        isDev,
        registrySize: registry.length,
        pulseState
    };
}
function handleVectorize(query) {
    return {
        query,
        matches: searchRegistry(query)
    };
}
function handleGemini(prompt) {
    const matches = searchRegistry(prompt).slice(0, 3);
    const response = matches.length
        ? `Gemini synthesis: ${matches.map((item) => item.name).join(", ")} are the strongest registry matches for "${prompt}".`
        : `Gemini synthesis: no direct registry match for "${prompt}", so generate a new control path anchored on the requested intent.`;
    return {
        prompt,
        response,
        references: matches
    };
}
function handleUnreal(command) {
    return {
        command,
        summary: `Queued Unreal orchestration for "${command}".`,
        transport: {
            mode: "ipc",
            target: "PrimordiaUnreal World"
        }
    };
}
function handleVisionCore(source) {
    return {
        source,
        summary: `Captured VisionCore frame from "${source}".`,
        captureId: makeId("vision"),
        timestamp: nowIso()
    };
}
function handleGenerator(seed) {
    return {
        seed,
        output: `Generated operator flow from "${seed}" using the desktop control-plane scaffold.`
    };
}
function handlePulse(message) {
    return {
        id: makeId("pulse"),
        domain: "pulse",
        timestamp: nowIso(),
        message
    };
}
