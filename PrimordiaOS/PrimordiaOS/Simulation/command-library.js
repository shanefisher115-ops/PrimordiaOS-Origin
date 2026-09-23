/**
 * Command Library for Simulation Realm (Genesis, Big Bang, Volumetrics, Camera).
 */
export const SimulationCommands = {
  BIG_BANG: {
    type: "BIG_BANG_TRIGGER",
    payload: { genesis: true, singularity_intensity: 2.5, niagara_system: "NS_PrimordiaBigBang" }
  },
  RESET_CAMERA: {
    type: "CAMERA_TRANSITION",
    payload: { target: "ORIGIN", duration_s: 3.0 }
  },
  SET_ATMOSPHERE: {
    type: "ATMOSPHERE_CONFIG",
    payload: { volumetrics: true, fog_density: 0.05, cosmic_color: "#33bbff" }
  }
};

export default SimulationCommands;
