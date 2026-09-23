// =============================================================
// PrimordiaOS World Stability Dashboard 2.0
// React + Express real-time dashboard for world stability metrics
// =============================================================

import express from "express";
import path from "path";
import fs from "fs";

import { predictWorldDrift } from "./Primordia_WorldDriftPredictor.mjs";
import { getViolationHistory, getCorrectionHistory, getDriftHistory, getRuleEvolutionHistory }
    from "./Primordia_WorldRulesMemoryEngine.mjs";
import { computeSceneHash } from "./Primordia_WorldstateEngine.mjs";

// -------------------------------------------------------------
// SERVER SETUP
// -------------------------------------------------------------

export function startWorldStabilityDashboard(port = 8090) {
    const app = express();
    app.use(express.json());

    console.log(`[PrimordiaOS] World Stability Dashboard 2.0 running on port ${port}`);

    // ---------------------------------------------------------
    // API ENDPOINTS FOR REACT FRONTEND
    // ---------------------------------------------------------

    app.get("/api/prediction", (req, res) => {
        res.json(predictWorldDrift());
    });

    app.get("/api/violations", (req, res) => {
        res.json(getViolationHistory());
    });

    app.get("/api/corrections", (req, res) => {
        res.json(getCorrectionHistory());
    });

    app.get("/api/drift", (req, res) => {
        res.json(getDriftHistory());
    });

    app.get("/api/rules", (req, res) => {
        res.json(getRuleEvolutionHistory());
    });

    app.get("/api/hash", async (req, res) => {
        const hash = await computeSceneHash();
        res.json({ hash });
    });

    // ---------------------------------------------------------
    // SERVE REACT FRONTEND
    // ---------------------------------------------------------

    const frontendPath = path.resolve("C:/Users/Shane/PrimordiaOS/dashboard2");
    app.use(express.static(frontendPath));

    app.get("*", (req, res) => {
        res.sendFile(path.join(frontendPath, "index.html"));
    });

    // ---------------------------------------------------------
    // START SERVER
    // ---------------------------------------------------------

    app.listen(port);
}
