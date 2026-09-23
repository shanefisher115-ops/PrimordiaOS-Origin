// primordia-core/voice/voice-bootstrap.ts

import { VoiceEngine } from './voice-engine';
import { VoiceLoop } from './voice-loop';

export async function bootstrapVoice(eventBus: any, config: any) {
  const engine = new VoiceEngine({ eventBus, config });
  const loop = new VoiceLoop(engine);

  loop.start();

  return { engine, loop };
}
