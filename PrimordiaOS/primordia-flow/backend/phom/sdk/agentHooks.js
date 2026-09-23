/**
 * ==============================================================================
 * ⭐ PHOM SDK — AGENT LIFECYCLE HOOKS
 * Inspect, intercept, and augment agent execution flows:
 * - beforeRun: Intercept input before agent processes
 * - afterRun: Transform output or record telemetry
 * - onError: Graceful fallback or error tracking
 * - onStateChange: Observability into state transitions
 * ==============================================================================
 */
export class PhomAgentHooksManager {
    globalHooks = {
        beforeRun: [],
        afterRun: [],
        onError: [],
        onStateChange: []
    };
    agentSpecificHooks = new Map();
    registerBeforeRun(agentName, hook) {
        if (agentName === 'all') {
            this.globalHooks.beforeRun.push(hook);
        }
        else {
            const hooks = this.getOrCreateAgentHooks(agentName);
            hooks.beforeRun.push(hook);
        }
    }
    registerAfterRun(agentName, hook) {
        if (agentName === 'all') {
            this.globalHooks.afterRun.push(hook);
        }
        else {
            const hooks = this.getOrCreateAgentHooks(agentName);
            hooks.afterRun.push(hook);
        }
    }
    registerOnError(agentName, hook) {
        if (agentName === 'all') {
            this.globalHooks.onError.push(hook);
        }
        else {
            const hooks = this.getOrCreateAgentHooks(agentName);
            hooks.onError.push(hook);
        }
    }
    registerOnStateChange(hook) {
        this.globalHooks.onStateChange.push(hook);
    }
    async triggerBeforeRun(context) {
        const list = [...(this.globalHooks.beforeRun || [])];
        const specific = this.agentSpecificHooks.get(context.agentName)?.beforeRun;
        if (specific)
            list.push(...specific);
        for (const hook of list) {
            try {
                await hook(context);
            }
            catch (e) {
                console.warn(`[PhomAgentHooks] Error in beforeRun for ${context.agentName}:`, e.message);
            }
        }
    }
    async triggerAfterRun(context) {
        const list = [...(this.globalHooks.afterRun || [])];
        const specific = this.agentSpecificHooks.get(context.agentName)?.afterRun;
        if (specific)
            list.push(...specific);
        for (const hook of list) {
            try {
                await hook(context);
            }
            catch (e) {
                console.warn(`[PhomAgentHooks] Error in afterRun for ${context.agentName}:`, e.message);
            }
        }
    }
    async triggerOnError(context) {
        const list = [...(this.globalHooks.onError || [])];
        const specific = this.agentSpecificHooks.get(context.agentName)?.onError;
        if (specific)
            list.push(...specific);
        for (const hook of list) {
            try {
                await hook(context);
            }
            catch (e) {
                console.warn(`[PhomAgentHooks] Error in onError for ${context.agentName}:`, e.message);
            }
        }
    }
    async triggerOnStateChange(agentName, fromState, toState, meta) {
        for (const hook of this.globalHooks.onStateChange || []) {
            try {
                await hook(agentName, fromState, toState, meta);
            }
            catch (e) {
                console.warn(`[PhomAgentHooks] Error in onStateChange for ${agentName}:`, e.message);
            }
        }
    }
    getOrCreateAgentHooks(name) {
        if (!this.agentSpecificHooks.has(name)) {
            this.agentSpecificHooks.set(name, {
                beforeRun: [],
                afterRun: [],
                onError: [],
                onStateChange: []
            });
        }
        return this.agentSpecificHooks.get(name);
    }
}
export const defaultAgentHooks = new PhomAgentHooksManager();
