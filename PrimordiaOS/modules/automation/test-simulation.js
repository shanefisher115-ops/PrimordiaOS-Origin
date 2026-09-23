// modules/automation/test-simulation.ts
import * as fs from 'fs';
import * as path from 'path';
const rootDir = path.resolve(__dirname, '../..');
function writeMockMetric(fileName, payload) {
    const filePath = path.join(rootDir, fileName);
    const data = {
        type: fileName.replace('.txt', ''),
        payload
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[Simulator] Wrote mock payload to ${fileName}:`, payload);
}
function runSimulation() {
    console.log('[Simulator] Starting PrimordiaOS Automation Simulator...');
    // Phase 1: High Energy Spike
    console.log('\n--- Simulation Phase 1: High Energy Spike (Expected: pulse_energy_spike active, spawn_pulsewave_burst triggered) ---');
    writeMockMetric('AGENT_STATE.txt', {
        id: "caption-agent",
        energy: 0.92, // > 0.85
        status: "active",
        task: "generating_caption",
        vector: [0.2, 0.9, 0.4]
    });
    writeMockMetric('EVOLUTION_PATCH.txt', {
        patchId: "patch_0021",
        reason: "low retention",
        change: "caption_rewrite",
        intensity: 0.25 // metric_stream_variance = 0.25 * 0.8 = 0.20 (<= 0.3)
    });
    // Wait 3 seconds to let loop run
    setTimeout(() => {
        // Phase 2: Composite Evolution Trigger
        console.log('\n--- Simulation Phase 2: Composite Evolution Trigger (Expected: universe_evolution_trigger active, spawn_evolution_fractal_burst triggered) ---');
        writeMockMetric('AGENT_STATE.txt', {
            id: "caption-agent",
            energy: 0.78, // > 0.70 but < 0.85
            status: "active",
            task: "optimizing_engine",
            vector: [0.1, 0.8, 0.3]
        });
        writeMockMetric('EVOLUTION_PATCH.txt', {
            patchId: "patch_0022",
            reason: "fractal growth",
            change: "evolution_pulse",
            intensity: 0.55 // metric_stream_variance = 0.55 * 0.8 = 0.44 (> 0.3)
        });
    }, 4000);
    // Wait another 4 seconds to reset to normal
    setTimeout(() => {
        console.log('\n--- Simulation Phase 3: System Normalized (Expected: signals inactive) ---');
        writeMockMetric('AGENT_STATE.txt', {
            id: "caption-agent",
            energy: 0.65, // <= 0.70
            status: "active",
            task: "idle",
            vector: [0.05, 0.5, 0.15]
        });
        writeMockMetric('EVOLUTION_PATCH.txt', {
            patchId: "patch_0023",
            reason: "steady state",
            change: "none",
            intensity: 0.2 // metric_stream_variance = 0.16
        });
        console.log('\n[Simulator] Simulation complete. Shutting down...');
    }, 8000);
}
runSimulation();
