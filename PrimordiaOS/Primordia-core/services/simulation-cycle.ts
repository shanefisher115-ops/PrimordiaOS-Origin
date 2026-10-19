import { runSimulation } from "../../Primordia-sim/simulation/run-simulation.ts";
import { runCadCycle } from "./cad-cycles.ts";
import { checkLimits, designLimits } from "../../Primordia-ai/schemas/design-limits.ts";

/**
 * Evolves a part until it meets its limits, no agent can change it, or `iterations` mutations are spent.
 * The limits are in runSimulation's units (MPa, kg, mm) and come from cadParams (stressLimit, targetMass,
 * deformationLimit, maxOverhangs), with defaults from Primordia-ai/schemas/design-limits.ts.
 *
 * Returns the last design and its metrics, whether it met every limit, and one history entry per design
 * simulated: its params, metrics, limits and checks, and the mutation that led away from it.
 */
export async function runSimulationLoop(initialGeometry: any, initialCadParams: any, iterations: number = 5) {
    let geometry = initialGeometry;
    let cadParams = initialCadParams;
    const history: any[] = [];

    const evaluate = () => {
        // Run simulation on current geometry
        const metrics = runSimulation(geometry);

        // === STOPPING CRITERIA ===
        const limits = designLimits(cadParams, metrics);
        const ok = checkLimits(metrics, limits);
        history.push({ cadParams, metrics, limits, ok });
        return ok;
    };

    let ok = evaluate();
    for (let i = 0; i < iterations && !ok.all; i++) {
        console.log(`\n[PrimordiaCore] === Evolution Cycle ${i + 1} ===`);

        // Run CAD cycle with metrics + current params
        const { updatedParams, newGeometry, cycleInfo } = await runCadCycle(history[history.length - 1].metrics, cadParams);
        console.log("[PrimordiaCore] Cycle info:", cycleInfo);
        history[history.length - 1].cycle = cycleInfo;
        if (!newGeometry) {
            console.log("[PrimordiaCore] No agent can improve the design further — stopping evolution.");
            break;
        }

        // Update state for next iteration
        cadParams = updatedParams;
        geometry = newGeometry;
        ok = evaluate();
    }

    if (ok.all) console.log("[PrimordiaCore] Design stabilized — stopping evolution.");

    const last = history[history.length - 1];
    return { finalGeometry: geometry, finalCadParams: cadParams, finalMetrics: last.metrics, stabilized: ok.all, history };
}
