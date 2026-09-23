// primordia-core/voice/voice-loop.ts
import { VoiceRouter } from './voice-router';
export class VoiceLoop {
    engine;
    router;
    running = false;
    constructor(engine) {
        this.engine = engine;
        this.router = new VoiceRouter();
    }
    async start() {
        this.running = true;
        while (this.running) {
            const transcript = await this.engine.listen();
            const response = `You said: ${transcript}`;
            const voiceId = this.router.resolve('vision');
            await this.engine.speak(response, voiceId);
        }
    }
    stop() {
        this.running = false;
    }
}
