export * from './contentMemory';
export * from './contentAnalytics';
export * from './contentRewriter';
export * from './contentGenerator';
export * from './contentOptimizer';
export * from './contentPersonaEngine';


// =====================================
// PrimordiaOS Kernel Bootloader
// Unified Platform Initialization
// =====================================

// Unreal world-builder integration
import { bootstrapUnrealIntegration } from "./modules/unreal/bootstrap";

// TikTok Live engine
import { TikTokLive } from "./modules/live/tiktok-live-engine";

// Unified platform orchestrator
import { Platform } from "./modules/platform/unified-platform";

// Social channel registry
import { Social } from "./modules/platform/social-graph";

// Content graph
import { Content } from "./modules/platform/content-graph";

// Autopost engine
import { autopost } from "./modules/automation/autopost-router";

// Monetization + analytics brains
import { Monetization } from "./modules/platform/monetization-brain";
import { Analytics } from "./modules/platform/analytics-brain";

// Optional: scheduler
import { Scheduler } from "./modules/automation/scheduler"; // if exists


// =====================================
// BOOT SEQUENCE
// =====================================

console.log("====================================");
console.log("      PrimordiaOS Unified Platform     ");
console.log("====================================");

// 1. Boot Unreal integration + autonomous world builder
console.log("[BOOT] Initializing Unreal Engine link...");
bootstrapUnrealIntegration();

// 2. Start TikTok Live 24-hour engine
console.log("[BOOT] Starting TikTok Live engine...");
TikTokLive.start();

// 3. Load social graph
console.log("[BOOT] Social graph loaded:");
console.log(Social.enabled());

// 4. Load content graph
console.log("[BOOT] Content graph initialized:");
console.log(Content.all());

// 5. Start automation scheduler (if present)
try {
  console.log("[BOOT] Starting automation scheduler...");
  Scheduler.start();
} catch {
  console.log("[BOOT] No scheduler found, skipping.");
}

// 6. Unified platform startup tasks
console.log("[BOOT] Unified platform online.");

// Example: register a Technophysical episode
Platform.registerContent({
  id: "tech-ep-001",
  type: "technophysical_episode",
  title: "Technophysical: Episode 1 – Birth of PrimordiaOS",
  channels: ["technophysical", "tiktok", "youtube", "moneyplughub"]
});

// Example: broadcast it everywhere
Platform.broadcastContent("tech-ep-001");

// Example: schedule it into TikTok Live
Platform.scheduleLiveSegment("tech-ep-001");

// Example: record monetization + analytics
Platform.recordRevenue("moneyplughub", 12.50);
Platform.recordMetric("tech-ep-001", "tiktok", "views", 100);


// =====================================
// OS READY
// =====================================

console.log("====================================");
console.log("      PrimordiaOS Boot Complete       ");
console.log("====================================");
