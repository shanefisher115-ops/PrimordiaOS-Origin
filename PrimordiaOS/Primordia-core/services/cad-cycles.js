import { evaluateDesignCycle } from "./ai-engine";
import { applyMutation } from "../../primordia-cad/cadops/apply-mutation";
import { regenerateGeometry } from "../../primordia-cad/cadroot/regenerate-geometry";
export async function runCadCycle(simMetrics, cadParams) {
    console.log("[PrimordiaCore] Starting CAD cycle...");
    // 1. Run AI agents and get the winning mutation
    const result = await evaluateDesignCycle(simMetrics, cadParams);
    console.log("[PrimordiaCore] AI mutation selected:", result);
    // 2. Apply mutation to CAD parameters
    const updatedParams = applyMutation(cadParams, result.mutation);
    // 3. Regenerate geometry using updated parameters
    const newGeometry = regenerateGeometry(updatedParams);
    console.log("[PrimordiaCore] Geometry regenerated and ready for simulation.");
    // 4. Return updated geometry + params so primordia-sim can run again
    return {
        updatedParams,
        newGeometry,
        cycleInfo: {
            agent: result.agent,
            justification: result.justification,
            confidence: result.confidence,
            timestamp: Date.now()
        }
    };
}
