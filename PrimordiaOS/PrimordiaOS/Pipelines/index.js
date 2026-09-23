import { cloudflarePipeline } from "./cloudflare-pipeline.js";
import { unrealPipeline } from "./unreal-pipeline.js";
import { moneyPlugPipeline } from "./moneyplug-pipeline.js";
import { multiAgentPipeline } from "./multiagent-pipeline.js";

export const Pipelines = {
  cloudflare: cloudflarePipeline,
  unreal: unrealPipeline,
  moneyplug: moneyPlugPipeline,
  multiagent: multiAgentPipeline
};

export async function startAllPipelines() {
  console.log("[Pipelines Aggregator] Starting all 4 integrated physical pipelines...");
  await cloudflarePipeline.start();
  await unrealPipeline.start();
  await moneyPlugPipeline.start();
  await multiAgentPipeline.start();
  return Pipelines;
}

export {
  cloudflarePipeline,
  unrealPipeline,
  moneyPlugPipeline,
  multiAgentPipeline
};

export default Pipelines;
