import { generateCaption } from "./ai.ts";
import { postToX } from "./modules/post-x.ts";
import { postToInstagram } from "./modules/post-instagram.ts";
import { postToYouTube } from "./modules/post-youtube.ts";
export async function autopostRouter(payload) {
    const caption = await generateCaption(payload);
    await Promise.all([
        postToX(caption),
        postToInstagram(caption),
        postToYouTube(caption),
    ]);
    return caption;
}
