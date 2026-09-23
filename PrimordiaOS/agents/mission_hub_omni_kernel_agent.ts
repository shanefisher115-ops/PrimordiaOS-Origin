import { MissionHubOmniKernel } from "../modules/mission_hub_omni_kernel";

export class MissionHubOmniKernelAgent {
  constructor() {
    this.start();
  }

  start() {
    // Kernel makes decisions every 3 seconds
    setInterval(() => {
      MissionHubOmniKernel.decide();
    }, 3000);

    console.log("[MissionHubOmniKernelAgent] Online.");
  }
}

export const MissionHubOmniKernelAgentInstance =
  new MissionHubOmniKernelAgent();
