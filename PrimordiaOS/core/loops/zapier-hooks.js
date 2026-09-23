export class ZapierHookManager {
    hooks = [];
    dispatch(type, payload) {
        const event = {
            id: `zap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type,
            payload,
            timestamp: Date.now()
        };
        this.hooks.push(event);
        return event;
    }
    getHooks() {
        return this.hooks;
    }
}
