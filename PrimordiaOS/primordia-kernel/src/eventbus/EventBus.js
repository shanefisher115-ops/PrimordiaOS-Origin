/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * EventBus.ts - Global event routing, wildcard dispatch, and event quarantine
 */
export class EventBus {
    logger;
    safety;
    subscriptions = new Map();
    eventHistory = [];
    historyCapacity;
    constructor(logger, safety, historyCapacity = 500) {
        this.logger = logger.forSubsystem('eventbus');
        this.safety = safety;
        this.historyCapacity = historyCapacity;
    }
    /**
     * Subscribe to a topic or wildcard pattern.
     * Wildcards: 'realm.*' matches 'realm.boot', 'kernel.**' matches 'kernel.ipc.error'
     */
    subscribe(topicPattern, handler, options = {}) {
        const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const subscription = {
            id: subId,
            topicPattern,
            handler: handler,
            sourceFilter: options.sourceFilter,
            priority: options.priority ?? 10,
        };
        this.subscriptions.set(subId, subscription);
        this.logger.debug(`Subscribed [${subId}] to pattern "${topicPattern}"`);
        return subId;
    }
    unsubscribe(subscriptionId) {
        const existed = this.subscriptions.delete(subscriptionId);
        if (existed) {
            this.logger.debug(`Unsubscribed [${subscriptionId}]`);
        }
        return existed;
    }
    /**
     * Publish an event to the global event bus.
     * Enforces safety checks before dispatch; invalid events are quarantined.
     */
    async emit(topic, payload, source = 'kernel', options = {}) {
        const safetyCheck = this.safety.validateEvent(topic, source, payload);
        if (!safetyCheck.allowed) {
            const quarantineId = this.safety.quarantine(source, safetyCheck.reason || 'Event policy failure', {
                topic,
                payload,
            });
            this.logger.warn(`Event quarantined [${quarantineId}]: ${safetyCheck.reason}`);
            return { success: false, error: safetyCheck.reason };
        }
        const event = {
            id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            topic,
            source,
            timestamp: new Date().toISOString(),
            payload,
            traceId: options.traceId,
            priority: options.priority || 'NORMAL',
        };
        // Store in history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.historyCapacity) {
            this.eventHistory.shift();
        }
        this.logger.logEvent(topic, event.id, source, { priority: event.priority });
        // Collect and sort matching subscribers by priority (ascending: lowest number = highest priority)
        const matching = Array.from(this.subscriptions.values())
            .filter(sub => this.matchesPattern(topic, sub.topicPattern))
            .filter(sub => !sub.sourceFilter || sub.sourceFilter === source)
            .sort((a, b) => a.priority - b.priority);
        // Dispatch asynchronously to all handlers
        for (const sub of matching) {
            try {
                const res = sub.handler(event);
                if (res instanceof Promise) {
                    res.catch(err => {
                        this.logger.error(`Error in async event handler for subscription [${sub.id}] on topic "${topic}"`, err);
                    });
                }
            }
            catch (err) {
                this.logger.error(`Error executing handler for subscription [${sub.id}] on topic "${topic}"`, err);
            }
        }
        return { success: true, eventId: event.id };
    }
    /**
     * Matches topic against wildcard patterns
     * Examples:
     *   'realm.start' matches 'realm.start'
     *   'realm.start' matches 'realm.*'
     *   'kernel.ipc.stream.chunk' matches 'kernel.**'
     */
    matchesPattern(topic, pattern) {
        if (pattern === '*' || pattern === '**' || pattern === topic) {
            return true;
        }
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '___DOUBLE_STAR___')
            .replace(/\*/g, '[^.]+')
            .replace(/___DOUBLE_STAR___/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(topic);
    }
    getHistory(limit = 100, topicFilter) {
        let list = this.eventHistory;
        if (topicFilter) {
            list = list.filter(e => this.matchesPattern(e.topic, topicFilter));
        }
        return list.slice(-limit);
    }
    getSubscriptionCount() {
        return this.subscriptions.size;
    }
    clearHistory() {
        this.eventHistory.length = 0;
    }
}
