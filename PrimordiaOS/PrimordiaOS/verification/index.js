// primordiaos/realms/verification/index.ts
import { CommandBus } from "../../command-bus/bus";
import { verifySimulation } from "./verifySimulation";
export function registerVerificationRealm() {
    CommandBus.register("verification.verifySimulation", verifySimulation);
}
