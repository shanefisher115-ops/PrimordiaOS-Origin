// primordia-core/voice/voice-engine.ts
export class VoiceEngine {
    eventBus;
    config;
    constructor(opts) {
        this.eventBus = opts.eventBus;
        this.config = opts.config;
    }
    /**
     * Speak using ElevenLabs.
     */
    async speak(text, voiceId) {
        this.eventBus.emit('voice.outbound', {
            type: 'tts.request',
            voiceId,
            text,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Listen using microphone → STT.
     */
    async listen() {
        const transcript = "simulated transcript";
        this.eventBus.emit('voice.inbound', {
            type: 'stt.transcript',
            transcript,
            timestamp: new Date().toISOString(),
        });
        return transcript;
    }
}
