import { MissionHubDirector } from "../modules/mission_hub_director";

export class MissionHubDirectorAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Director evaluates the world every 4 seconds
    setInterval(() => {
      MissionHubDirector.decide(this.userId);
    }, 4000);

    console.log("[MissionHubDirectorAgent] Online.");
  }
}

export const MissionHubDirectorAgentInstance =
  new MissionHubDirectorAgent();
