import { GlobalTimeline } from "./GlobalTimeline.js";
import { UEBridge } from "../simulation/bridge/ue-bridge.js";

export const GlobalSimulation = {
  update(event, data = {}) {
    if (typeof window !== "undefined" && window.PrimordiaOS?.simulation) {
      window.PrimordiaOS.simulation[event] = data;
    }
    UEBridge.send(event, data);
    GlobalTimeline.write({
      type: "simulation",
      title: `Unreal Engine: ${event}`,
      summary: `Spatial telemetry synchronized from UE5 dedicated runtime.`,
      data,
      icon: "??"
    });
  }
};
