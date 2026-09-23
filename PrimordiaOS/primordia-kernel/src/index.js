/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * index.ts - Main Subsystem Entrypoint & Public Exports
 */
import { fileURLToPath } from 'node:url';
import { PrimordiaKernelEngine } from './core/PrimordiaKernelEngine.js';
// Core Exports
export { PrimordiaKernelEngine } from './core/PrimordiaKernelEngine.js';
export { KernelBoot } from './core/KernelBoot.js';
export { KernelShutdown } from './core/KernelShutdown.js';
export { KernelHeartbeat } from './core/KernelHeartbeat.js';
// Subsystem Exports
export { RealmRegistry } from './registry/RealmRegistry.js';
export { EventBus } from './eventbus/EventBus.js';
export { IPCRouter } from './ipc/IPCRouter.js';
export { KernelTaskScheduler } from './scheduler/KernelTaskScheduler.js';
export { KernelMemoryEngine } from './memory/KernelMemoryEngine.js';
export { KernelSafetyLayer } from './safety/KernelSafetyLayer.js';
export { KernelLogger } from './logging/KernelLogger.js';
export { KernelCommandInterface } from './commands/KernelCommandInterface.js';
// Telemetry Multiplexer Exports
export { TelemetryMultiplexer, PtpTimestampSyncEngine, AdaptiveDeJitterBuffer, DeadbandFilter, MultiplexSubsystemMask, } from './telemetry/TelemetryMultiplexer.js';
/**
 * Bootstrap and launch the Masterplane Kernel when invoked directly
 */
export async function bootstrap() {
    const engine = new PrimordiaKernelEngine();
    await engine.boot();
    return engine;
}
// Check if running as main entrypoint
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
    bootstrap().catch(err => {
        console.error('Fatal: Failed to bootstrap PrimordiaOS Kernel', err);
        process.exit(1);
    });
}
