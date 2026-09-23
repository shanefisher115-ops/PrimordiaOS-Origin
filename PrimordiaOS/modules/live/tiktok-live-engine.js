export class TikTokLiveEngine {
    running = false;
    queue = [];
    start() {
        this.running = true;
        console.log("[TikTokLive] Started 24h loop");
        this.loop();
    }
    stop() {
        this.running = false;
        console.log("[TikTokLive] Stopped");
    }
    enqueue(segment) {
        this.queue.push(segment);
    }
    async loop() {
        while (this.running) {
            const segment = this.queue.shift();
            if (!segment) {
                console.log("[TikTokLive] Idle cosmic visual");
            }
            else {
                console.log("[TikTokLive] Playing segment:", segment);
            }
            await new Promise(r => setTimeout(r, 60_000)); // 1 minute per segment
        }
    }
}
export const TikTokLive = new TikTokLiveEngine();
