import { CONFIG } from "../config";
import { assertPlatformIdentity } from "../identity";
export async function postToX(caption) {
    assertPlatformIdentity("x");
    await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${CONFIG.X_TOKEN || ''}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: caption }),
    });
}
