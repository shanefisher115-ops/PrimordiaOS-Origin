import { ConsoleReporter } from "./harness/runner-core.js";

// Tier 1 Feature Coverage Suites
import { suite as f01 } from "./tier1-feature/f01-master-spine-health.test.js";
import { suite as f02 } from "./tier1-feature/f02-sse-stream-telemetry.test.js";
import { suite as f03 } from "./tier1-feature/f03-ws-bridge-bigbang.test.js";
import { suite as f04 } from "./tier1-feature/f04-economic-realm-api.test.js";
import { suite as f05 } from "./tier1-feature/f05-termux-mobile-cli.test.js";
import { suite as f06 } from "./tier1-feature/f06-cloudflare-gateway.test.js";
import { suite as f07 } from "./tier1-feature/f07-ue5-rpc-bridge.test.js";
import { suite as f08 } from "./tier1-feature/f08-autonomous-pulse-loop.test.js";
import { suite as f09 } from "./tier1-feature/f09-osmium-ledger-chain.test.js";
import { suite as f10 } from "./tier1-feature/f10-metadata-registries.test.js";
import { suite as f11 } from "./tier1-feature/f11-syndicate-yield-routing.test.js";
import { suite as f12 } from "./tier1-feature/f12-cockpit-hud-dashboard.test.js";
import { suite as f13 } from "./tier1-feature/f13-antigrav-sovereignty.test.js";

// Tier 2 Boundary & Corner Case Suites
import { suite as b01 } from "./tier2-boundary/b01-master-spine-bounds.test.js";
import { suite as b02 } from "./tier2-boundary/b02-sse-stream-bounds.test.js";
import { suite as b03 } from "./tier2-boundary/b03-ws-bridge-bounds.test.js";
import { suite as b04 } from "./tier2-boundary/b04-economic-api-bounds.test.js";
import { suite as b05 } from "./tier2-boundary/b05-termux-cli-bounds.test.js";
import { suite as b06 } from "./tier2-boundary/b06-cloudflare-gateway-bounds.test.js";
import { suite as b07 } from "./tier2-boundary/b07-ue5-rpc-bounds.test.js";
import { suite as b08 } from "./tier2-boundary/b08-pulse-mutex-bounds.test.js";
import { suite as b09 } from "./tier2-boundary/b09-osmium-tamper-bounds.test.js";
import { suite as b10 } from "./tier2-boundary/b10-registries-corrupt-bounds.test.js";
import { suite as b11 } from "./tier2-boundary/b11-syndicate-overflow-bounds.test.js";
import { suite as b12 } from "./tier2-boundary/b12-hud-resilience-bounds.test.js";
import { suite as b13 } from "./tier2-boundary/b13-antigrav-threshold-bounds.test.js";

// Tier 3 Cross-Realm Combinations
import { suite as cr01 } from "./tier3-cross-realm/cr01-spine-to-simulation.test.js";
import { suite as cr02 } from "./tier3-cross-realm/cr02-pulse-to-osmium-ledger.test.js";
import { suite as cr03 } from "./tier3-cross-realm/cr03-osmium-to-syndicate-yield.test.js";
import { suite as cr04 } from "./tier3-cross-realm/cr04-mobile-to-spine-telemetry.test.js";
import { suite as cr05 } from "./tier3-cross-realm/cr05-cloudflare-edge-to-spine.test.js";
import { suite as cr06 } from "./tier3-cross-realm/cr06-ue5-trigger-to-sse-hud.test.js";
import { suite as cr07 } from "./tier3-cross-realm/cr07-antigrav-to-pulse-gate.test.js";
import { suite as cr08 } from "./tier3-cross-realm/cr08-syndicate-to-economic-db.test.js";
import { suite as cr09 } from "./tier3-cross-realm/cr09-registry-to-realm-mapping.test.js";
import { suite as cr10 } from "./tier3-cross-realm/cr10-multiclient-sse-ws-broadcast.test.js";
import { suite as cr11 } from "./tier3-cross-realm/cr11-mobile-cli-to-antigrav-audit.test.js";
import { suite as cr12 } from "./tier3-cross-realm/cr12-pulse-failure-isolation.test.js";
import { suite as cr13 } from "./tier3-cross-realm/cr13-simulated-cloud-gateway-failover.test.js";
import { suite as cr14 } from "./tier3-cross-realm/cr14-osmium-tamper-detection-sse.test.js";
import { suite as cr15 } from "./tier3-cross-realm/cr15-full-5realm-handshake.test.js";

// Tier 4 Real-World Application Workloads
import { suite as app01 } from "./tier4-application/app01-cold-boot-genesis.test.js";
import { suite as app02 } from "./tier4-application/app02-autonomous-syndicate-yield.test.js";
import { suite as app03 } from "./tier4-application/app03-ue5-genesis-niagara.test.js";
import { suite as app04 } from "./tier4-application/app04-mobile-ingest-edge-fallback.test.js";
import { suite as app05 } from "./tier4-application/app05-antigrav-full-system-audit.test.js";
import { suite as app06 } from "./tier4-application/app06-syndicate-guild-war-cycle.test.js";
import { suite as app07 } from "./tier4-application/app07-multi-vessel-state-coherence.test.js";

export async function runAllTests() {
  console.log("================================================================================");
  console.log("       PRIMORDIAOS COMPREHENSIVE 4-TIER E2E TEST SUITE RUNNER                   ");
  console.log("================================================================================");

  const reporter = new ConsoleReporter();

  const allSuites = [
    // Tier 1 (13 suites, 65 tests)
    f01, f02, f03, f04, f05, f06, f07, f08, f09, f10, f11, f12, f13,
    // Tier 2 (13 suites, 65 tests)
    b01, b02, b03, b04, b05, b06, b07, b08, b09, b10, b11, b12, b13,
    // Tier 3 (15 suites, 15+ tests)
    cr01, cr02, cr03, cr04, cr05, cr06, cr07, cr08, cr09, cr10, cr11, cr12, cr13, cr14, cr15,
    // Tier 4 (7 suites, 7+ tests)
    app01, app02, app03, app04, app05, app06, app07
  ];

  for (const suite of allSuites) {
    await suite.run(reporter);
  }

  const result = reporter.summary();
  return result;
}
