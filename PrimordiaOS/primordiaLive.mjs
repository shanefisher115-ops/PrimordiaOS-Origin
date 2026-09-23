#!/usr/bin/env node
import { bootPrimordia } from "./dist/index.js";

(async () => {
  console.log("[PrimordiaLive] Booting PrimordiaOS in LIVE mode...");
  await bootPrimordia({ mode: "LIVE" });
})();
