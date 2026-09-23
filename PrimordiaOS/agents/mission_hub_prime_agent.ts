import { MissionHubPrime } from "../modules/mission_hub_prime";

export class MissionHubPrimeAgent {
  constructor() {
    this.start();
  }

  start() {
    // Auto-check ascension every 5 seconds
    setInterval(() => {
      if (MissionHubPrime.canAscend()) {
        MissionHubPrime.ascend();
      }
    }, 5000);

    console.log("[MissionHubPrimeAgent] Online.");
  }
}

export const MissionHubPrimeAgentInstance =
  new MissionHubPrimeAgent();
