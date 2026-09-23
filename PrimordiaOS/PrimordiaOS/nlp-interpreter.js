// primordiaos/nlp-interpreter.js
// Natural language → PrimordiaOS event mapping

export function interpretEnglishCommand(text) {
    const t = text.toLowerCase();

    // SWARM IGNITION
    if (t.includes("ignite") && t.includes("swarm")) {
        return {
            topic: "swarm.broadcast",
            payload: { payload: "ignite" }
        };
    }

    // REALM LINKING
    if (t.includes("link") && t.includes("realms")) {
        return {
            topic: "realms.link",
            payload: { auto: true }
        };
    }

    // TEMPORAL SLICE
    if (t.includes("slice") && t.includes("time")) {
        return {
            topic: "temporal.slice.request",
            payload: { reason: "manual" }
        };
    }

    // CLOUD SYNC
    if (t.includes("sync") && t.includes("cloud")) {
        return {
            topic: "cloud.sync.request",
            payload: { force: true }
        };
    }

    // DEFAULT
    return {
        topic: "system.unknown.command",
        payload: { text }
    };
}
