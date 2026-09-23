import { CONFIG } from "../config";
import { assertPlatformIdentity } from "../identity";
export async function postToYoutube(title, description) {
    assertPlatformIdentity("youtube");
    await fetch("https://www.googleapis.com/youtube/v3/videos", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${CONFIG.YOUTUBE_TOKEN || ''}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ snippet: { title, description } }),
    });
}
