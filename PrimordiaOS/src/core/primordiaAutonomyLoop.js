// Primordia Autonomy Loop
// The unified orchestrator that ties all autonomy engines together.
// This is the "brainstem" of PrimordiaOS.
import { AutonomousCycleEngine } from "./autonomousCycleEngine";
import { SelfEvaluationEngine } from "../omniscience/selfEvaluationEngine";
import { AutonomousTriggerMatrix } from "../state/autonomousTriggerMatrix";
import { StrategyAdjustmentEngine } from "../horizon/strategyAdjustmentEngine";
import { AutonomousMemoryConsolidator } from "../continuity/autonomousMemoryConsolidator";
import { RealmGovernanceEngine } from "../omniscience/realmGovernanceEngine";
import { AutonomousSimulationDirector } from "../simulation/autonomousSimulationDirector";
import { AutonomousExpansionEngine } from "./autonomousExpansionEngine";
import { SelfRepairEngine } from "../continuity/selfRepairEngine";
import { AutonomousGoalFormationEngine } from "../omniscience/autonomousGoalFormationEngine";
export class PrimordiaAutonomyLoop {
    ace = new AutonomousCycleEngine(8000);
    see = new SelfEvaluationEngine();
    atm = new AutonomousTriggerMatrix();
    sae = new StrategyAdjustmentEngine();
    amc = new AutonomousMemoryConsolidator();
    rge = new RealmGovernanceEngine();
    asd = new AutonomousSimulationDirector();
    aee = new AutonomousExpansionEngine();
    sre = new SelfRepairEngine();
    agfe = new AutonomousGoalFormationEngine();
    constructor() {
        this.registerDefaultPolicies();
        this.registerDefaultTriggers();
    }
    start() {
        console.log("[PrimordiaOS] Autonomy Loop Starting...");
        this.ace.start();
        this.beginContinuousLoop();
    }
    stop() {
        console.log("[PrimordiaOS] Autonomy Loop Stopping...");
        this.ace.stop();
    }
    async beginContinuousLoop() {
        while (true) {
            await this.runAutonomyStep();
            await new Promise((r) => setTimeout(r, 5000));
        }
    }
    async runAutonomyStep() {
        const timestamp = new Date();
        console.log("\n[AutonomyLoop] Step @", timestamp.toISOString());
        // 1. Self-Repair Scan
        const issues = this.sre.detectIssues();
        for (const issue of issues) {
            await this.sre.repair(issue);
        }
        // 2. Evaluate Realms
        const evaluation = this.see.evaluateBatch([
            { realm: "autonomy", signal: "cycle", payload: {}, timestamp },
            { realm: "creator", signal: "cycle", payload: {}, timestamp },
            { realm: "simulation", signal: "cycle", payload: {}, timestamp },
        ]);
        // 3. Adjust Strategies
        for (const result of evaluation) {
            const adjustment = this.sae.adjust({ realm: result.realm, parameters: {} }, result.score);
            console.log("[SAE] Adjustment:", adjustment);
        }
        // 4. Autonomous Memory Consolidation
        const memoryEvents = evaluation.map((e) => ({
            id: `mem-${Date.now()}`,
            realm: e.realm,
            importance: e.score,
            timestamp,
            data: e,
        }));
        const consolidated = this.amc.consolidate(memoryEvents);
        await this.amc.persist(consolidated);
        // 5. Simulation Step
        await this.asd.step("primordia-world");
        // 6. Autonomous Trigger Dispatch
        await this.atm.dispatch("cycle", { timestamp });
        // 7. Autonomous Expansion (if needed)
        if (Math.random() > 0.92) {
            const proposal = this.aee.proposeNewCapability("autonomy", "Detected opportunity for expansion");
            await this.aee.enact(proposal);
        }
        // 8. Autonomous Goal Formation
        if (Math.random() > 0.85) {
            const goal = this.agfe.createGoal("autonomy", "Increase system adaptive intelligence", Math.random());
            console.log("[AGFE] New Goal:", goal);
        }
    }
    registerDefaultPolicies() {
        this.rge.setPolicy({
            realm: "autonomy",
            allowedActions: [],
            blockedActions: ["delete_core", "overwrite_kernel"],
        });
    }
    registerDefaultTriggers() {
        this.atm.registerRule({
            id: "cycle-log",
            realm: "autonomy",
            pattern: /cycle/,
            action: async () => {
                console.log("[ATM] Autonomous cycle trigger fired.");
            },
        });
    }
}
