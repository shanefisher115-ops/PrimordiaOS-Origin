import { bootstrapUnrealIntegration } from "../modules/unreal/bootstrap";
import { TikTokLive } from "../modules/live/tiktok-live-engine";
import { Platform } from "../modules/platform/unified-platform";
import { Social } from "../modules/platform/social-graph";
import { Content } from "../modules/platform/content-graph";
import { Scheduler } from "../modules/automation/scheduler";
console.log("====================================");
console.log("      PrimordiaOS Unified Platform     ");
console.log("====================================");
console.log("[BOOT] Initializing Unreal Engine link...");
bootstrapUnrealIntegration();
console.log("[BOOT] Starting TikTok Live engine...");
TikTokLive.start();
console.log("[BOOT] Social graph loaded:");
console.log(Social.enabled());
console.log("[BOOT] Content graph initialized:");
console.log(Content.all());
try {
    console.log("[BOOT] Starting automation scheduler...");
    Scheduler.start();
}
catch {
    console.log("[BOOT] No scheduler found, skipping.");
}
console.log("[BOOT] Unified platform online.");
Platform.registerContent({
    id: "tech-ep-001",
    type: "technophysical_episode",
    title: "Technophysical: Episode 1 – Birth of PrimordiaOS",
    channels: ["technophysical", "tiktok", "youtube", "moneyplughub"]
});
Platform.broadcastContent("tech-ep-001");
Platform.scheduleLiveSegment("tech-ep-001");
Platform.recordRevenue("moneyplughub", 12.50);
Platform.recordMetric("tech-ep-001", "tiktok", "views", 100);
console.log("====================================");
console.log("      PrimordiaOS Boot Complete       ");
console.log("====================================");
