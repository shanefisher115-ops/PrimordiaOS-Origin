import { evaluateDesignCycle } from "./ai-engine.ts";
import { applyMutation } from "../../Primordia-cad/cadops/apply-mutation.ts";
import { regenerateGeometry } from "../../Primordia-cad/cadroot/regenerate-geometry.ts";
import { changedDesignKeys, resolveDesign } from "../../Primordia-ai/agents/levers.ts";

export async function runCadCycle(simMetrics: any, cadParams: any) {
    console.log("[PrimordiaCore] Starting CAD cycle...");

    // 0. Spell out every generator parameter as the kernel built it, so a mutation steps from the real value
    const params = resolveDesign(cadParams);

    // 1. Run AI agents and get the winning mutation
    const result = await evaluateDesignCycle(simMetrics, params);

    console.log("[PrimordiaCore] AI mutation selected:", result);

    // 2. Apply mutation to CAD parameters
    const updatedParams = resolveDesign(applyMutation(params, result.mutation));
    const changed = changedDesignKeys(params, updatedParams);

    // 3. Regenerate geometry using updated parameters, unless the winning agent had nothing to change
    const newGeometry = changed.length > 0 ? regenerateGeometry(updatedParams) : null;

    console.log(newGeometry
        ? `[PrimordiaCore] Geometry regenerated (${changed.join(", ")} changed) and ready for simulation.`
        : "[PrimordiaCore] No agent proposed a change to the part.");

    // 4. Return updated geometry + params so primordia-sim can run again (newGeometry is null if nothing changed)
    return {
        updatedParams: newGeometry ? updatedParams : params,
        newGeometry,
        cycleInfo: {
            agent: result.agent,
            justification: result.justification,
            confidence: result.confidence,
            mutation: result.mutation,
            changed,
            timestamp: Date.now()
        }
    };
}
