// primordiaos/nlp-interpreter.js
// Hybrid Natural Language → PrimordiaOS event mapping

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RULE-BASED FAST PATH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ruleBasedInterpret(t) {
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

    return null; // no rule matched
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEMANTIC ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const verbMap = {
    start: "start",
    activate: "start",
    initiate: "start",
    launch: "start",
    ignite: "ignite",
    broadcast: "broadcast",
    send: "broadcast",
    link: "link",
    connect: "link",
    join: "link",
    slice: "slice",
    cut: "slice",
    rewind: "rewind",
    reverse: "rewind",
    sync: "sync",
    synchronize: "sync",
    update: "update",
    show: "show",
    display: "show",
    inspect: "inspect"
};

const targetMap = {
    "temporal engine": "temporal",
    "time": "temporal",
    "swarm": "swarm",
    "agents": "swarm",
    "realms": "realms",
    "vision realm": "vision",
    "sim realm": "sim",
    "cloud realm": "cloud",
    "cloud": "cloud",
    "heartbeat": "monitoring",
    "metrics": "monitoring",
    "storage": "storage",
    "network": "network",
    "router": "network",
    "devtools": "devtools"
};

function semanticInterpret(text) {
    const t = text.toLowerCase();

    // find verb
    let verb = null;
    for (const v in verbMap) {
        if (t.includes(v)) {
            verb = verbMap[v];
            break;
        }
    }

    // find target
    let target = null;
    for (const phrase in targetMap) {
        if (t.includes(phrase)) {
            target = targetMap[phrase];
            break;
        }
    }

    // If no verb or target found → unknown
    if (!verb || !target) {
        return {
            topic: "system.unknown.command",
            payload: { text }
        };
    }

    // semantic mapping
    if (verb === "start" && target === "temporal") {
        return {
            topic: "temporal.start",
            payload: { reason: "nlp" }
        };
    }

    if (verb === "broadcast" && target === "swarm") {
        return {
            topic: "swarm.broadcast",
            payload: { payload: "nlp-broadcast" }
        };
    }

    if (verb === "link" && target === "realms") {
        return {
            topic: "realms.link",
            payload: { auto: true }
        };
    }

    if (verb === "slice" && target === "temporal") {
        return {
            topic: "temporal.slice.request",
            payload: { reason: "nlp" }
        };
    }

    if (verb === "rewind" && target === "temporal") {
        return {
            topic: "temporal.rewind",
            payload: { amount: "5s", reason: "nlp" }
        };
    }

    if (verb === "sync" && target === "cloud") {
        return {
            topic: "cloud.sync.request",
            payload: { force: true }
        };
    }

    if (verb === "show" && target === "monitoring") {
        return {
            topic: "monitoring.heartbeat.request",
            payload: { reason: "nlp" }
        };
    }

    // fallback
    return {
        topic: "system.unknown.command",
        payload: { text }
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HYBRID INTERPRETER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function interpretEnglishCommand(text) {
    const t = text.toLowerCase();

    // 1. Try rule-based first
    const rule = ruleBasedInterpret(t);
    if (rule) return rule;

    // 2. Semantic fallback
    return semanticInterpret(text);
}
