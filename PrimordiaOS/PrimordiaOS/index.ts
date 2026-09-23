import { registerAllRealms } from "./realms/registerAllRealms";
import "./command-bus/registerIgnitionEvent";
import { AntiGravity } from "./core/AntiGravity";

registerAllRealms();

console.log("PrimordiaOS booted.");

AntiGravity.run("IGNITION_EVENT");
