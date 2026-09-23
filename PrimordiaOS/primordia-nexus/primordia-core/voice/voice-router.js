// primordia-core/voice/voice-router.ts
export class VoiceRouter {
    routes;
    constructor() {
        this.routes = {
            vision: 'cosmic-minimal',
            osmium: 'business-money',
            unreal: 'mythic',
            pipeline: 'neutral-system',
            agent: 'creator-voice',
        };
    }
    resolve(realm) {
        return this.routes[realm] || 'neutral-system';
    }
}
