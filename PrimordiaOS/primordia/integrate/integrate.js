export function integrateSubsystem(os, subsystem) {
    os.subsystems.push(subsystem);
    eval(subsystem.code);
}
