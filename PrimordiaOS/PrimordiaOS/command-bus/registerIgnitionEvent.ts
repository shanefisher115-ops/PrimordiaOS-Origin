import { AntiGravity } from "../core/AntiGravity";

AntiGravity.route("IGNITION_EVENT", {
  entryRealm: "browser",
  sequence: [
    "browser.extractLogo",
    "cloud.prepareLogoForSimulation",
    "simulation.placeLogoInUnreal",
    "verification.verifySimulation",
    "overlay.injectSimulationOverlay"
  ],
  safety: {
    idempotent: true,
    maxDepth: 3,
    rollbackOnFailure: true
  }
});
