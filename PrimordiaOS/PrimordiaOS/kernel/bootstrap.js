import { spine } from "./spine.js";
import { Realms } from "../realms/index.js";
import { Pipelines } from "../pipelines/index.js";
import { Agents } from "../agents/index.js";
import { restServer } from "../interfaces/rest-server.js";
import { simulationWsServer } from "../simulation/websocket-server.js";

/**
 * Universal Multi-Realm Bootloader for PrimordiaOS.
 */
export async function bootPrimordiaOS() {
  if (spine.booted) {
    return spine.getStatus();
  }

  console.log("================================================================================");
  console.log("             PRIMORDIAOS MASTER SPINE UNIVERSAL BOOTLOADER                      ");
  console.log("================================================================================");

  // 1. Register all 5 Realms into Master Spine
  spine.registerRealm("local_realm", Realms.local);
  spine.registerRealm("cloud_realm", Realms.cloud);
  spine.registerRealm("simulation_realm", Realms.simulation);
  spine.registerRealm("economic_realm", Realms.economy);
  spine.registerRealm("identity_realm", Realms.identity);

  // 2. Register all Multi-Agent entities
  spine.registerAgent("antigrav_guardian", Agents.guardian);
  spine.registerAgent("realm_builder", Agents.realmBuilder);
  spine.registerAgent("loop_engineer", Agents.loopEngineer);
  spine.registerAgent("infra_navigator", Agents.infraNavigator);
  spine.registerAgent("lexicon_scribe", Agents.lexiconScribe);

  // 3. Register Pipelines
  spine.registerPipeline("cloudflare_pipeline", Pipelines.cloudflare);
  spine.registerPipeline("unreal_pipeline", Pipelines.unreal);
  spine.registerPipeline("moneyplug_pipeline", Pipelines.moneyplug);
  spine.registerPipeline("multiagent_pipeline", Pipelines.multiagent);

  // 4. Start Servers & Listeners
  restServer.start();
  simulationWsServer.start();

  // 5. Execute Master Spine Boot & Activate Autonomous Coherence
  const status = await spine.boot();
  return status;
}

// Auto-boot if executed directly via CLI
if (process.argv[1] && (process.argv[1].endsWith("bootstrap.js") || process.argv[1].endsWith("kernel\\index.js"))) {
  bootPrimordiaOS().catch(console.error);
}
