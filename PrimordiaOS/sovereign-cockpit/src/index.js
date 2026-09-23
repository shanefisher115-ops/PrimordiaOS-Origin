/**
 * PrimordiaOS Sovereign Cockpit — Main Subsystem Entrypoint
 * Exports the SovereignCockpitEngine and all core subsystems,
 * and handles standalone daemon lifecycle initialization.
 */
import { fileURLToPath } from 'node:url';
import { SovereignCockpitEngine } from './core/SovereignCockpitEngine.js';
import { logger } from './logging/CockpitLogger.js';
// Re-export all Subsystems and Types
export { SovereignCockpitEngine } from './core/SovereignCockpitEngine.js';
export { CockpitStateMachine } from './core/CockpitStateMachine.js';
export { CockpitCommandBus } from './core/CockpitCommandBus.js';
export { CRTRenderer } from './crt/CRTRenderer.js';
export { CRTMath, DEFAULT_CRT_UNIFORMS } from './crt/CRTShaders.js';
export { HolographicPanelSystem } from './holo/HolographicPanelSystem.js';
export { PanelRegistry } from './holo/PanelRegistry.js';
export { TelemetryRouter } from './telemetry/TelemetryRouter.js';
export * from './telemetry/TelemetryTypes.js';
export { UnrealViewport } from './unreal/UnrealViewport.js';
export { VisionCoreOverlayEngine } from './visioncore/VisionCoreOverlayEngine.js';
export { CosmicField } from './visioncore/CosmicField.js';
export { KernelInterface } from './kernel/KernelInterface.js';
export { CockpitSafetyGuards, safetyGuards } from './safety/CockpitSafetyGuards.js';
export { CockpitLogger, logger } from './logging/CockpitLogger.js';
// Default export
export default SovereignCockpitEngine;
/**
 * Standalone CLI Daemon Bootstrap
 */
const isDirectExecution = () => {
    try {
        if (!process.argv[1])
            return false;
        const currentFilePath = fileURLToPath(import.meta.url);
        const executedFilePath = process.argv[1].replace(/\\/g, '/');
        const normalizedCurrent = currentFilePath.replace(/\\/g, '/');
        return (executedFilePath.endsWith('/dist/index.js') ||
            executedFilePath.endsWith('/src/index.ts') ||
            normalizedCurrent === executedFilePath);
    }
    catch {
        return false;
    }
};
if (isDirectExecution()) {
    const engine = new SovereignCockpitEngine();
    // Attach OS Process Signal Handlers
    const shutdown = async (signal) => {
        logger.info('Daemon', `Received OS signal [${signal}]. Commencing sovereign shutdown...`);
        try {
            await engine.shutdown();
            process.exit(0);
        }
        catch (err) {
            logger.error('Daemon', `Error during graceful shutdown: ${err}`);
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    // Uncaught error quarantine
    process.on('uncaughtException', (err) => {
        logger.panic('Daemon', `Uncaught exception captured by sovereign boundary: ${err.message}`, err);
    });
    process.on('unhandledRejection', (reason) => {
        logger.error('Daemon', `Unhandled rejection captured by sovereign boundary: ${reason}`);
    });
    // Launch Engine
    engine.bootstrap().catch((err) => {
        logger.panic('Daemon', `Fatal error during cockpit bootstrap: ${err.message}`, err);
        process.exit(1);
    });
}
