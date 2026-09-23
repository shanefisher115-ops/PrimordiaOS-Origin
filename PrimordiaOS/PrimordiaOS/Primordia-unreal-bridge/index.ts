// Primordia Unreal Bridge — Canonical Entry Point

import { startUnrealBootstrap } from "./bootstrap";

export function startUnrealBridge() {
  console.log("[PrimordiaUnrealBridge] Launching Unreal integration layer...");
  startUnrealBootstrap();
}
