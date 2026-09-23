import { MissionHubOvermind } from "../modules/mission_hub_overmind";

export class MissionHubOvermindAgent {
  constructor() {
    this.start();
  }

  start() {
    MissionHubOvermind.awaken();

    // Overmind makes decisions every 5 seconds
    setInterval(() => {
      MissionHubOvermind.decide();
    }, 5000);

    console.log("[MissionHubOvermindAgent] Online.");
  }
}

export const MissionHubOvermindAgentInstance =
  new MissionHubOvermindAgent();
