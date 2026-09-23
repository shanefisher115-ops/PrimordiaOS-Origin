import { runSimulation } from "../../primordia-sim/simulation/run-simulation";
import { runCadCycle } from "./cad-cycle";
export async function runSimulationLoop(initialGeometry, initialCadParams, iterations = 5) {
    let geometry = initialGeometry;
    let cadParams = initialCadParams;
    for (let i = 0; i < iterations; i++) {
        console.log(`\n[PrimordiaCore] === Evolution Cycle ${i + 1} ===`);
        // 1. Run simulation on current geometry
        const simMetrics = runSimulation(geometry);
        // === STOPPING CRITERIA ===
        const stressOK = simMetrics.maxStress < 100;
        const massOK = simMetrics.mass < 20;
        const deformationOK = simMetrics.maxDeformation < 5;
        if (stressOK && massOK && deformationOK) {
            console.log("[PrimordiaCore] Design stabilized — stopping evolution.");
            break;
        }
        // 2. Run CAD cycle with metrics + current params
        const { updatedParams, newGeometry, cycleInfo } = await runCadCycle(simMetrics, cadParams);
        // 3. Update state for next iteration
        cadParams = updatedParams;
        geometry = newGeometry;
        console.log("[PrimordiaCore] Cycle info:", cycleInfo);
    }
    return { finalGeometry: geometry, finalCadParams: cadParams };
}
