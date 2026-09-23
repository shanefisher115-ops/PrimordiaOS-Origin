import { autonomousLoopManager } from "./loop-manager.js";
import { Syndicates } from "./syndicates.js";

export const EconomyCore = {
  loopManager: autonomousLoopManager,
  syndicates: Syndicates
};

export default EconomyCore;
