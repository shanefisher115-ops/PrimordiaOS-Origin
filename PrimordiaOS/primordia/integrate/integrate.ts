import { PrimordiaSubsystem } from "../synthesis/PrimordiaSubsystem";

export function integrateSubsystem(os: any, subsystem: PrimordiaSubsystem) {
  os.subsystems.push(subsystem);
  eval(subsystem.code);
}
