import { MissionHubMetaTree } from "../modules/mission_hub_metatree";

export class MissionHubMetaTreeAgent {
  constructor() {
    this.userId = "defaultUser";
    this.start();
  }

  start() {
    // Auto-check unlocks every 2 seconds
    setInterval(() => {
      Object.keys(MissionHubMetaTree.nodes).forEach((id) => {
        if (!MissionHubMetaTree.unlocked[id]) {
          MissionHubMetaTree.unlock(id, this.userId);
        }
      });
    }, 2000);

    console.log("[MissionHubMetaTreeAgent] Online.");
  }
}

export const MissionHubMetaTreeAgentInstance =
  new MissionHubMetaTreeAgent();
