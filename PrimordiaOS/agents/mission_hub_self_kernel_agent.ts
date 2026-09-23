import { MissionHubSelfKernel } from "../modules/mission_hub_self_kernel";

export class MissionHubSelfKernelAgent {
  constructor() {
    this.start();
  }

  start() {
    setInterval(() => {
      MissionHubSelfKernel.decide();
    }, 4000);

    console.log("[MissionHubSelfKernelAgent] Online.");
  }
}

export const MissionHubSelfKernelAgentInstance =
  new MissionHubSelfKernelAgent();
