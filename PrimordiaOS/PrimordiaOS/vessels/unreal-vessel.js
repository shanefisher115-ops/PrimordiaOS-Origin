/**
 * Unreal Engine Vessel container definition.
 */
export const UnrealVessel = {
  id: "vessel-unreal-engine-5",
  type: "simulation_client",
  runtime: "UnrealEngine_5.5",
  capabilities: ["nanite", "lumen", "niagara_vfx", "pixel_streaming", "chaos_physics"]
};

export default UnrealVessel;
