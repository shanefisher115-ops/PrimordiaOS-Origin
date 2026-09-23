import { CONFIG } from "../config";
import { assertPlatformIdentity } from "../identity";
export async function fetchYoutubeMetrics() {
    assertPlatformIdentity("youtube");
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?mine=true&part=statistics", {
        headers: {
            Authorization: `Bearer ${CONFIG.YOUTUBE_TOKEN || ''}`,
        },
    });
    return await res.json();
}
