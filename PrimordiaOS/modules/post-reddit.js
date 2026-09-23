import { CONFIG } from "../config";
import { assertPlatformIdentity } from "../identity";
export async function postToReddit(title, text) {
    assertPlatformIdentity("reddit");
    await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${CONFIG.REDDIT_TOKEN || ''}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `kind=self&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`,
    });
}
