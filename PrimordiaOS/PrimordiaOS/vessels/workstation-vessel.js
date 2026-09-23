/**
 * Workstation Vessel container definition for Windows host.
 */
export const WorkstationVessel = {
  id: "vessel-workstation-windows",
  type: "host_workstation",
  os: "Windows_NT",
  capabilities: ["filesystem", "unreal_engine", "local_ports", "gpu_acceleration"]
};

export default WorkstationVessel;
