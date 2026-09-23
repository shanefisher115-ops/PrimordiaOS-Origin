// primordiaos/realms/registerAllRealms.ts

import { registerBrowserRealm } from "./browser";
import { registerCloudRealm } from "./cloud";
import { registerSimulationRealm } from "./simulation";
import { registerVerificationRealm } from "./verification";
import { registerOverlayRealm } from "./overlay";

export function registerAllRealms() {
  registerBrowserRealm();
  registerCloudRealm();
  registerSimulationRealm();
  registerVerificationRealm();
  registerOverlayRealm();
}
