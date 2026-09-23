export interface ZapierHookEvent {
    id: string;
    type: string;
    payload: Record<string, any>;
    timestamp: number;
}

export class ZapierHookManager {
    private hooks: ZapierHookEvent[] = [];

    public dispatch(type: string, payload: Record<string, any>): ZapierHookEvent {
        const event: ZapierHookEvent = {
            id: `zap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type,
            payload,
            timestamp: Date.now()
        };
        this.hooks.push(event);
        return event;
    }

    public getHooks(): ZapierHookEvent[] {
        return this.hooks;
    }
}
