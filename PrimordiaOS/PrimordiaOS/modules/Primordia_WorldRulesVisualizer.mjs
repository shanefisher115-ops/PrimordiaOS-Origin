// =============================================================
// PrimordiaOS World Rules Visualizer
// Web dashboard for rules, violations, scene hash, actors, logs
// =============================================================

import express from "express";
import fs from "fs";
import path from "path";

import { WorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { evaluateWorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { enforceWorldRules } from "./Primordia_WorldRulesEngine.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// SERVER SETUP
// -------------------------------------------------------------

export function startWorldRulesVisualizer(port = 8088) {
    const app = express();
    app.use(express.json());

    console.log(`[PrimordiaOS] World Rules Visualizer running on port ${port}`);

    // ---------------------------------------------------------
    // ROUTES
    // ---------------------------------------------------------

    // RULE LIST
    app.get("/rules", (req, res) => {
        res.json(Object.keys(WorldRules));
    });

    // RULE DESCRIPTION
    app.get("/rules/:name", (req, res) => {
        const rule = WorldRules[req.params.name];
        if (!rule) return res.status(404).json({ error: "Rule not found" });
        res.json(rule);
    });

    // VIOLATIONS
    app.get("/violations", async (req, res) => {
        const hash = await computeSceneHash();
        const state = hash.rawJson || hash.json;
        const violations = evaluateWorldRules(state);
        res.json(violations);
    });

    // SCENE HASH
    app.get("/hash", async (req, res) => {
        const hash = await computeSceneHash();
        res.json({ hash });
    });

    // ENFORCE RULES
    app.post("/enforce", async (req, res) => {
        const result = await enforceWorldRules();
        res.json(result);
    });

    // DSL LOADER
    app.post("/load-dsl", (req, res) => {
        const { dsl } = req.body;
        if (!dsl) return res.status(400).json({ error: "No DSL provided" });

        const file = path.resolve("loaded_rules.dsl");
        fs.writeFileSync(file, dsl);

        res.json({ status: "DSL loaded", file });
    });

    // ---------------------------------------------------------
    // FRONTEND UI
    // ---------------------------------------------------------

    app.get("/", (req, res) => {
        res.send(`
<!DOCTYPE html>
<html>
<head>
<title>PrimordiaOS World Rules Visualizer</title>
<style>
body { font-family: Arial; background: #111; color: #eee; padding: 20px; }
h1 { color: #00e0ff; }
button { padding: 10px 20px; margin: 10px; background: #00e0ff; border: none; cursor: pointer; }
pre { background: #222; padding: 10px; }
</style>
</head>
<body>

<h1>PrimordiaOS World Rules Visualizer</h1>

<button onclick="loadRules()">List Rules</button>
<button onclick="loadViolations()">Show Violations</button>
<button onclick="loadHash()">Scene Hash</button>
<button onclick="enforceRules()">Enforce Rules</button>

<h2>Output</h2>
<pre id="output">Click a button...</pre>

<script>
function show(data) {
    document.getElementById("output").textContent = JSON.stringify(data, null, 2);
}

async function loadRules() {
    const res = await fetch("/rules");
    show(await res.json());
}

async function loadViolations() {
    const res = await fetch("/violations");
    show(await res.json());
}

async function loadHash() {
    const res = await fetch("/hash");
    show(await res.json());
}

async function enforceRules() {
    const res = await fetch("/enforce", { method: "POST" });
    show(await res.json());
}
</script>

</body>
</html>
        `);
    });

    // ---------------------------------------------------------
    // START SERVER
    // ---------------------------------------------------------

    app.listen(port);
}
