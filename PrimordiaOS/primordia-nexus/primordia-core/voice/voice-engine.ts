// primordia-core/voice/voice-engine.ts

import { EventBus } from '../shared/event-bus';

export interface VoiceEngineOptions {
  eventBus: EventBus;
  config: any;
}

export class VoiceEngine {
  private eventBus: EventBus;
  private config: any;

  constructor(opts: VoiceEngineOptions) {
    this.eventBus = opts.eventBus;
    this.config = opts.config;
  }

  /**
   * Speak using ElevenLabs.
   */
  async speak(text: string, voiceId: string): Promise<void> {
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
  async listen(): Promise<string> {
    const transcript = "simulated transcript";

    this.eventBus.emit('voice.inbound', {
      type: 'stt.transcript',
      transcript,
      timestamp: new Date().toISOString(),
    });

    return transcript;
  }
}
