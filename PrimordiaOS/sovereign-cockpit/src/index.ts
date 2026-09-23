/**
 * PrimordiaOS Sovereign Cockpit — Main Subsystem Entrypoint
 * Exports the SovereignCockpitEngine and all core subsystems,
 * and handles standalone daemon lifecycle initialization.
 */

import { fileURLToPath } from 'node:url';
import { SovereignCockpitEngine } from './core/SovereignCockpitEngine.js';
import { logger } from './logging/CockpitLogger.js';

// Re-export all Subsystems and Types
export { SovereignCockpitEngine, type CockpitEngineConfig } from './core/SovereignCockpitEngine.js';
export { CockpitStateMachine, CockpitState, StateTransitionRecord } from './core/CockpitStateMachine.js';
export { CockpitCommandBus, CockpitCommand, CommandResult, CommandHandler, CommandMiddleware } from './core/CockpitCommandBus.js';

export { CRTRenderer, RasterPixel, CRTFrameStats } from './crt/CRTRenderer.js';
export { ColorLUT, CRTShaderUniforms, CRTMath, DEFAULT_CRT_UNIFORMS } from './crt/CRTShaders.js';

export { HolographicPanelSystem, LayoutPreset } from './holo/HolographicPanelSystem.js';
export { PanelRegistry, HolographicPanelState, PanelBlueprint, PanelDimensions, PanelLifecycleHooks } from './holo/PanelRegistry.js';

export { TelemetryRouter, TelemetrySubscription, TelemetryStats } from './telemetry/TelemetryRouter.js';
export * from './telemetry/TelemetryTypes.js';

export { UnrealViewport, ViewportState, UnrealSignalHandler } from './unreal/UnrealViewport.js';

export { VisionCoreOverlayEngine, OverlayFrame, ConstellationLine } from './visioncore/VisionCoreOverlayEngine.js';
export { CosmicField, CosmicParticle } from './visioncore/CosmicField.js';

export { KernelInterface, KernelCommandResponse, KernelEventListener } from './kernel/KernelInterface.js';

export { CockpitSafetyGuards, safetyGuards, LicenseTier, LicenseStatus, SanitizationResult } from './safety/CockpitSafetyGuards.js';
export { CockpitLogger, logger, LogLevel, LogEntry, LogListener } from './logging/CockpitLogger.js';

// Default export
export default SovereignCockpitEngine;

/**
 * Standalone CLI Daemon Bootstrap
 */
const isDirectExecution = (): boolean => {
  try {
    if (!process.argv[1]) return false;
    const currentFilePath = fileURLToPath(import.meta.url);
    const executedFilePath = process.argv[1].replace(/\\/g, '/');
    const normalizedCurrent = currentFilePath.replace(/\\/g, '/');
    return (
      executedFilePath.endsWith('/dist/index.js') ||
      executedFilePath.endsWith('/src/index.ts') ||
      normalizedCurrent === executedFilePath
    );
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  const engine = new SovereignCockpitEngine();

  // Attach OS Process Signal Handlers
  const shutdown = async (signal: string) => {
    logger.info('Daemon', `Received OS signal [${signal}]. Commencing sovereign shutdown...`);
    try {
      await engine.shutdown();
      process.exit(0);
    } catch (err) {
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
