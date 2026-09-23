// ===============================
// PrimordiaOS Kernel Bootloader
// ===============================

// Unreal world-builder
import { bootstrapUnrealIntegration } from "./Primordia-unreal-bridge/bootstrap";

// TikTok Live engine
import { TikTokLive } from "./modules/live/tiktok-live-engine";

// Social channel registry
import { Channels } from "./modules/automation/channel-registry";

// Autopost engine (optional startup tasks)
import { autopost } from "./modules/automation/autopost-router";

// Referral + MoneyPlugHub systems (if needed)
import { Portal } from "./modules/affiliate/portal";

// Scheduler (if you have one)
import { Scheduler } from "./modules/automation/scheduler"; // if exists


// ===============================
// BOOT SEQUENCE
// ===============================

console.log("====================================");
console.log("      PrimordiaOS Kernel Booting     ");
console.log("====================================");

// 1. Boot Unreal integration + world builder
console.log("[BOOT] Initializing Unreal Engine link...");
bootstrapUnrealIntegration();

// 2. Start TikTok Live 24-hour engine
console.log("[BOOT] Starting TikTok Live engine...");
TikTokLive.start();

// 3. Register social channels (already done in registry)
console.log("[BOOT] Social channels loaded:");
console.log(Channels.all());

// 4. Start automation scheduler (if you have one)
try {
  console.log("[BOOT] Starting automation scheduler...");
  Scheduler.start();
} catch {
  console.log("[BOOT] No scheduler found, skipping.");
}

// 5. Optional: autopost a startup message
autopost("technophysical", "PrimordiaOS has booted.");
autopost("moneyplughub", "MoneyPlugHub systems online.");

// 6. Boot affiliate portal
console.log("[BOOT] Affiliate portal online.");
console.log(Portal.list());

// ===============================
// OS READY
// ===============================

console.log("====================================");
console.log("      PrimordiaOS Boot Complete      ");
console.log("====================================");
