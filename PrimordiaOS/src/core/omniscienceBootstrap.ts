// core/omniscienceBootstrap.ts

import { reasoningLoop } from "../omniscience/reasoningLoop";

export function bootstrapOmniscience() {
  reasoningLoop.start();
  console.log("[Omniscience] reasoning loop started");
}
