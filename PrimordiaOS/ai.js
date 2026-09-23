import { CONFIG } from "./config.ts";
export async function generateCaption(payload) {
    const res = await fetch(CONFIG.AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt: "Generate caption for: " + JSON.stringify(payload)
        })
    });
    const data = await res.json();
    return data.text ?? "Generated caption";
}
