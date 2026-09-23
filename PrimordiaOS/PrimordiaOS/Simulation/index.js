// primordiaos/realms/simulation/index.ts
import { CommandBus } from "../../command-bus/bus";
import { placeLogoInUnreal } from "./placeLogoInUnreal";
export function registerSimulationRealm() {
    CommandBus.register("simulation.placeLogoInUnreal", placeLogoInUnreal);
}
