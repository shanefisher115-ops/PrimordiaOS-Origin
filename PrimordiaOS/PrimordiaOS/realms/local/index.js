import { localRuntime } from "./runtime.js";
import { workstationNode } from "./workstation-node.js";

export const LocalRealm = {
  id: "local_realm",
  name: "Local Workstation & Termux Realm",
  runtime: localRuntime,
  workstation: workstationNode,
  async init() {
    await localRuntime.init();
  }
};

export default LocalRealm;
