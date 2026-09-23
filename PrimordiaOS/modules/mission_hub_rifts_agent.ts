export class MissionHubRiftsAgent {
  constructor() {
    this.start();
  }

  start() {
    // Create rifts periodically
    setInterval(() => {
      MissionHubRifts.create("rift_" + Date.now(), {
        severity: Math.random(),
        type: ["temporal", "flux", "stability", "multiversal"][Math.floor(Math.random() * 4)]
      });
    }, 7000);

    // Destabilize rifts
    setInterval(() => {
      MissionHubRifts.activeRifts.forEach((id) => {
        const r = MissionHubRifts.rifts[id];
        if (r && r.severity > 0.6 && !r.unstable) {
          MissionHubRifts.destabilize(id);
        }
      });
    }, 5000);

    // Collapse extreme rifts
    setInterval(() => {
      MissionHubRifts.activeRifts.forEach((id) => {
        const r = MissionHubRifts.rifts[id];
        if (r && r.severity > 0.9) {
          MissionHubRifts.collapse(id);
        }
      });
    }, 9000);

    console.log("[MissionHubRiftsAgent] Online.");
  }
}

export const MissionHubRiftsAgentInstance = new MissionHubRiftsAgent();
