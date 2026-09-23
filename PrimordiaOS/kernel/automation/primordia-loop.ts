import { startScheduler } from "./scheduler";
import { startScoringEngine } from "./scoring-engine";
import { startActionExecutor } from "./action-executor";
import { startUnrealBridge } from "../../bridges/unreal/unreal-bridge";

export async function startPrimordiaAutomation() {
  startScoringEngine();
  startActionExecutor();
  startScheduler();
  startUnrealBridge();

  // optional: heartbeat
  console.log("[PrimordiaOS] Automation layer online.");
}
