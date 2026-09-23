import { unrealBridge } from "./unreal-bridge.js";
import { niagaraStream } from "./niagara-stream.js";
import { physicsKernel } from "./physics-kernel.js";

export const SimulationRealm = {
  id: "simulation_realm",
  name: "Unreal Engine 5 & Niagara Physics Realm",
  unreal: unrealBridge,
  niagara: niagaraStream,
  physics: physicsKernel,
  async init() {
    await unrealBridge.init();
  }
};

export default SimulationRealm;
