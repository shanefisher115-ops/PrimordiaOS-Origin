import { RealmSurfaceRegistry } from "../realms/realm-surface-registry";
import MissionHubUI from "../moneyplughub/src/frontend/shell/mission_hub_ui";

export const MissionHubSurface = {
  id: "surface_missionhub",
  name: "Mission Hub",
  icon: "missionhub",
  component: MissionHubUI
};

RealmSurfaceRegistry.register(MissionHubSurface);

console.log("[PrimordiaOS] Mission Hub Surface registered.");
