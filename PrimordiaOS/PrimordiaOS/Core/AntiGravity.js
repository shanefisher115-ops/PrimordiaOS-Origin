// primordiaos/core/AntiGravity.ts
import { Memory } from "../memory/schema";
import { CommandBus } from "../command-bus/bus";
export class AntiGravity {
    static pipelines = {};
    static depth = 0;
    // Register a multi‑realm pipeline
    static route(name, config) {
        AntiGravity.pipelines[name] = config;
    }
    // Execute a pipeline
    static async run(name) {
        const pipeline = AntiGravity.pipelines[name];
        if (!pipeline)
            throw new Error(`Pipeline not found: ${name}`);
        AntiGravity.depth = 0;
        for (const stepName of pipeline.sequence) {
            await AntiGravity.executeStep(stepName, pipeline);
        }
        return true;
    }
    // Execute a single step with safety rules
    static async executeStep(stepName, pipeline) {
        AntiGravity.depth++;
        if (AntiGravity.depth > pipeline.safety.maxDepth) {
            throw new Error("Max loop depth exceeded");
        }
        try {
            const step = CommandBus.get(stepName);
            if (!step)
                throw new Error(`Step not found: ${stepName}`);
            const result = await step();
            if (pipeline.safety.idempotent) {
                Memory.set(`idempotent_${stepName}`, result);
            }
            return result;
        }
        catch (err) {
            console.error(`Error in step ${stepName}:`, err);
            if (pipeline.safety.rollbackOnFailure) {
                await AntiGravity.rollback(stepName);
            }
            throw err;
        }
    }
    // Rollback logic (simple version)
    static async rollback(stepName) {
        const previous = Memory.get(`idempotent_${stepName}`);
        if (previous) {
            console.warn(`Rollback restored state for ${stepName}`);
            Memory.set(stepName, previous);
        }
    }
}
