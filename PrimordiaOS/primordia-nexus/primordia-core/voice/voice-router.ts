// primordia-core/voice/voice-router.ts

export class VoiceRouter {
  private routes: Record<string, string>;

  constructor() {
    this.routes = {
      vision: 'cosmic-minimal',
      osmium: 'business-money',
      unreal: 'mythic',
      pipeline: 'neutral-system',
      agent: 'creator-voice',
    };
  }

  resolve(realm: string): string {
    return this.routes[realm] || 'neutral-system';
  }
}
