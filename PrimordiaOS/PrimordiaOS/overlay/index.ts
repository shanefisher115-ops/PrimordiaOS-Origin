// primordiaos/realms/overlay/index.ts

import { CommandBus } from "../../command-bus/bus";
import { injectSimulationOverlay } from "./injectSimulationOverlay";

export function registerOverlayRealm() {
  CommandBus.register("overlay.injectSimulationOverlay", injectSimulationOverlay);
}
