/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelShutdown.ts - Graceful shutdown and resource reclamation orchestrator
 */
export class KernelShutdown {
    logger;
    constructor(logger) {
        this.logger = logger.forSubsystem('shutdown');
    }
    async executeShutdownSequence(context) {
        const startTime = Date.now();
        const stepsCompleted = [];
        this.logger.info('====================================================');
        this.logger.info('   INITIATING PRIMORDIA-OS MASTERPLANE SHUTDOWN     ');
        this.logger.info('====================================================');
        try {
            // 1. Broadcast shutdown event
            await context.eventBus.emit('kernel.shutdown.initiated', { timestamp: new Date().toISOString() }, 'kernel:shutdown');
            stepsCompleted.push('BROADCAST_SHUTDOWN_EVENT');
            // 2. Stop Heartbeat Pulse
            context.heartbeat.stop();
            stepsCompleted.push('STOP_HEARTBEAT');
            // 3. Drain Task Scheduler (allow current jobs to finish within 3s)
            await context.scheduler.drain(3000);
            stepsCompleted.push('DRAIN_SCHEDULER');
            // 4. Update realm states to OFFLINE
            for (const realm of context.registry.listRealms()) {
                context.registry.updateRealmStatus(realm.id, 'OFFLINE');
            }
            stepsCompleted.push('DEACTIVATE_REALMS');
            // 5. Persist State Snapshot to Disk
            await context.memory.persistToDisk();
            stepsCompleted.push('PERSIST_MEMORY_SNAPSHOT');
            const durationMs = Date.now() - startTime;
            this.logger.info(`PrimordiaOS Kernel halted cleanly in ${durationMs}ms.`);
            this.logger.info('====================================================');
            return {
                success: true,
                durationMs,
                stepsCompleted,
            };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.logger.fatal(`Shutdown error: ${errorMsg}`);
            return {
                success: false,
                durationMs,
                stepsCompleted,
                error: errorMsg,
            };
        }
    }
}
