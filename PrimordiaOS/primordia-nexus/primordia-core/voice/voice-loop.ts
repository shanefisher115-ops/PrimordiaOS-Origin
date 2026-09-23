// primordia-core/voice/voice-loop.ts

import { VoiceEngine } from './voice-engine';
import { VoiceRouter } from './voice-router';

export class VoiceLoop {
  private engine: VoiceEngine;
  private router: VoiceRouter;
  private running = false;

  constructor(engine: VoiceEngine) {
    this.engine = engine;
    this.router = new VoiceRouter();
  }

  async start(): Promise<void> {
    this.running = true;

    while (this.running) {
      const transcript = await this.engine.listen();

      const response = `You said: ${transcript}`;
      const voiceId = this.router.resolve('vision');

      await this.engine.speak(response, voiceId);
    }
  }

  stop(): void {
    this.running = false;
  }
}
