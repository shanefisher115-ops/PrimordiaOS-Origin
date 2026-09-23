import { WorkstationVessel } from "./workstation-vessel.js";
import { TermuxVessel } from "./termux-vessel.js";
import { CloudVessel } from "./cloud-vessel.js";
import { UnrealVessel } from "./unreal-vessel.js";

export const Vessels = {
  workstation: WorkstationVessel,
  termux: TermuxVessel,
  cloud: CloudVessel,
  unreal: UnrealVessel
};

export default Vessels;
