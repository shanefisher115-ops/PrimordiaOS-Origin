import { CONFIG } from "../config";
import { assertPlatformIdentity } from "../identity";
export async function postToLinkedin(caption) {
    assertPlatformIdentity("linkedin");
    await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${CONFIG.LINKEDIN_TOKEN || ''}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ author: "urn:li:person:me", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: caption } } } }),
    });
}
