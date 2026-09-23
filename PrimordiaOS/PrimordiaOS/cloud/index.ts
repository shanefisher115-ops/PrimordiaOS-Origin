// primordiaos/realms/cloud/index.ts

import { CommandBus } from "../../command-bus/bus";
import { prepareLogoForSimulation } from "./prepareLogoForSimulation";

export function registerCloudRealm() {
  CommandBus.register(
    "cloud.prepareLogoForSimulation",
    prepareLogoForSimulation
  );
}
