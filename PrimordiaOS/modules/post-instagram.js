import { CONFIG } from "../config";
import { assertPlatformIdentity } from "../identity";
export async function postToInstagram(caption, mediaUrl) {
    assertPlatformIdentity("instagram");
    await fetch("https://graph.facebook.com/v18.0/me/media", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${CONFIG.IG_TOKEN || ''}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ caption, image_url: mediaUrl }),
    });
}
