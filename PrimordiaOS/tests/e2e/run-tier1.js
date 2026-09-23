import { ConsoleReporter } from "./harness/runner-core.js";
import { suite as f01Suite } from "./tier1-feature/f01-master-spine-health.test.js";
import { suite as f02Suite } from "./tier1-feature/f02-sse-stream-telemetry.test.js";
import { suite as f03Suite } from "./tier1-feature/f03-ws-bridge-bigbang.test.js";
import { suite as f04Suite } from "./tier1-feature/f04-economic-realm-api.test.js";

async function runTier1Suites() {
  const reporter = new ConsoleReporter();
  console.log("================================================================================");
  console.log("              PRIMORDIAOS TIER 1 E2E FEATURE TEST RUNNER                        ");
  console.log("================================================================================");

  await f01Suite.run(reporter);
  await f02Suite.run(reporter);
  await f03Suite.run(reporter);
  await f04Suite.run(reporter);

  const summary = reporter.summary();
  return summary;
}

export { runTier1Suites };

if (process.argv[1] && process.argv[1].endsWith("run-tier1.js")) {
  runTier1Suites().then(res => {
    process.exit(res.success ? 0 : 1);
  }).catch(err => {
    console.error("Test runner error:", err);
    process.exit(1);
  });
}
