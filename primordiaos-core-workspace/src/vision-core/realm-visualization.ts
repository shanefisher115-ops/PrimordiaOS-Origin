import { realmEngine } from "../realm-engine";
import { unrealBridge } from "../unreal-bridge";

export class RealmVisualization {
  start() {
    unrealBridge.on(async msg => {
      if (msg.type === "request.realms") {
        const realms = realmEngine.list();
        console.log("[RealmViz] Unreal requested realms, sending:", realms);
      }
    });
  }
}

export const realmVisualization = new RealmVisualization();
