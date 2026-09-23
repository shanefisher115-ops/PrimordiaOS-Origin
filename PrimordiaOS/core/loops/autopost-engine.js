export async function autopost(platform, payload) {
    switch (platform) {
        case "tiktok": return postToTikTok(payload);
        case "instagram": return postToInstagram(payload);
        case "youtube": return postToYouTube(payload);
        case "facebook": return postToFacebook(payload);
        case "x": return postToX(payload);
        case "threads": return postToThreads(payload);
        case "pinterest": return postToPinterest(payload);
        case "snapchat": return postToSnapchat(payload);
        default: throw new Error("Unknown platform");
    }
}
