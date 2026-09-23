import { autopost } from "./posting.ts";
import { ingestMetrics } from "./metrics.ts";
import { computePulse, maybePatchDefaults } from "./evolution.ts";
export async function runScheduler() {
    console.log("Running cycle…");
    await autopost();
    const metrics = await ingestMetrics();
    const pulse = computePulse(metrics);
    await maybePatchDefaults(pulse);
    console.log("Cycle complete.");
}
