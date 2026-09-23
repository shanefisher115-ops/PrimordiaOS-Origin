import { Content } from "./content-graph";
import { Monetization } from "./monetization-brain";
import { Analytics } from "./analytics-brain";
import { autopost } from "../automation/autopost-router";
import { TikTokLive } from "../live/tiktok-live-engine";
export class UnifiedPlatform {
    registerContent(node) {
        Content.add(node);
    }
    async broadcastContent(id) {
        const node = Content.get(id);
        if (!node) {
            console.warn("[UnifiedPlatform] Content not found:", id);
            return;
        }
        for (const channel of node.channels) {
            await autopost(channel, `[${node.type}] ${node.title}`);
        }
    }
    scheduleLiveSegment(contentId) {
        const node = Content.get(contentId);
        if (!node)
            return;
        TikTokLive.enqueue({
            type: node.type === "technophysical_episode" ? "technophysical_episode" : "cosmic_visual",
            id: node.id
        });
    }
    recordRevenue(source, amount, currency = "USD") {
        Monetization.record({
            source,
            amount,
            currency,
            timestamp: Date.now()
        });
    }
    recordMetric(contentId, channelId, type, value) {
        Analytics.record({
            key: { contentId, channelId },
            type,
            value,
            timestamp: Date.now()
        });
    }
}
export const Platform = new UnifiedPlatform();
