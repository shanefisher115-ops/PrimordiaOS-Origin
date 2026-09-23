/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelHeartbeat.ts - Periodic vitality pulse generator, telemetry aggregator, and realm health sentinel
 */
export class KernelHeartbeat {
    logger;
    registry;
    eventBus;
    memoryEngine;
    intervalMs;
    timerRef;
    pulseCount = 0;
    startTime = Date.now();
    currentWorldState = 'STABLE';
    constructor(logger, registry, eventBus, memoryEngine, intervalMs = 3000) {
        this.logger = logger.forSubsystem('heartbeat');
        this.registry = registry;
        this.eventBus = eventBus;
        this.memoryEngine = memoryEngine;
        this.intervalMs = intervalMs;
    }
    start() {
        if (this.timerRef)
            return;
        this.startTime = Date.now();
        this.timerRef = setInterval(() => this.pulse(), this.intervalMs);
        this.logger.info(`Kernel Heartbeat initialized (interval: ${this.intervalMs}ms)`);
    }
    stop() {
        if (this.timerRef) {
            clearInterval(this.timerRef);
            this.timerRef = undefined;
            this.logger.info('Kernel Heartbeat stopped.');
        }
    }
    async pulse() {
        this.pulseCount++;
        const mem = process.memoryUsage();
        const realms = this.registry.listRealms();
        const activeCount = realms.filter(r => r.status === 'ACTIVE').length;
        const degradedCount = realms.filter(r => r.status === 'DEGRADED').length;
        const offlineCount = realms.filter(r => r.status === 'OFFLINE' || r.status === 'SUSPENDED').length;
        // Evaluate WorldState equilibrium
        if (degradedCount > 0 || offlineCount > 1) {
            this.currentWorldState = 'DEGRADED';
        }
        else if (mem.heapUsed / 1024 / 1024 > 500) {
            this.currentWorldState = 'FLUX';
        }
        else {
            this.currentWorldState = 'STABLE';
        }
        const metrics = {
            pulseCount: this.pulseCount,
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            worldState: this.currentWorldState,
            memory: {
                rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
                heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
                heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
            },
            realms: {
                total: realms.length,
                active: activeCount,
                degraded: degradedCount,
                offline: offlineCount,
            },
            eventBusSubscriptions: this.eventBus.getSubscriptionCount(),
            timestamp: new Date().toISOString(),
        };
        // Store latest vitality in memory engine
        this.memoryEngine.set('kernel', 'vitality', metrics);
        // Broadcast heartbeat pulse across event bus
        await this.eventBus.emit('kernel.heartbeat', metrics, 'kernel:heartbeat');
        this.logger.debug(`[PULSE #${this.pulseCount}] State: ${this.currentWorldState} | Realms: ${activeCount}/${realms.length} active | Heap: ${metrics.memory.heapUsedMb}MB`);
        return metrics;
    }
    setWorldState(state) {
        this.currentWorldState = state;
        this.logger.info(`WorldState forced to: ${state}`);
    }
    getLatestMetrics() {
        const cached = this.memoryEngine.get('kernel', 'vitality');
        if (cached)
            return cached;
        const mem = process.memoryUsage();
        return {
            pulseCount: this.pulseCount,
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            worldState: this.currentWorldState,
            memory: {
                rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
                heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
                heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
            },
            realms: {
                total: this.registry.listRealms().length,
                active: this.registry.listRealms().filter((r) => r.status === 'ACTIVE').length,
                degraded: 0,
                offline: 0,
            },
            eventBusSubscriptions: this.eventBus.getSubscriptionCount(),
            timestamp: new Date().toISOString(),
        };
    }
}
