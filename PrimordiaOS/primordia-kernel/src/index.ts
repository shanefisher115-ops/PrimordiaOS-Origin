/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * index.ts - Main Subsystem Entrypoint & Public Exports
 */

import { fileURLToPath } from 'node:url';
import { PrimordiaKernelEngine } from './core/PrimordiaKernelEngine.js';

// Core Exports
export { PrimordiaKernelEngine, type KernelState, type KernelEngineOptions } from './core/PrimordiaKernelEngine.js';
export { KernelBoot, type BootContext, type BootStepReport } from './core/KernelBoot.js';
export { KernelShutdown, type ShutdownReport } from './core/KernelShutdown.js';
export { KernelHeartbeat, type VitalityMetrics, type WorldStateEquilibrium } from './core/KernelHeartbeat.js';

// Subsystem Exports
export { RealmRegistry, type RealmDescriptor, type RealmStatus } from './registry/RealmRegistry.js';
export { EventBus, type KernelEvent, type EventHandler, type Subscription } from './eventbus/EventBus.js';
export { IPCRouter, type IPCEnvelope, type IPCResponse, type IPCHandler, type IPCStreamListener } from './ipc/IPCRouter.js';
export { KernelTaskScheduler, type ScheduledTask, type TaskPriority, type TaskStatus, type TaskHandler } from './scheduler/KernelTaskScheduler.js';
export { KernelMemoryEngine, type MemoryRecord, type MemorySnapshot, type MemoryEngineOptions } from './memory/KernelMemoryEngine.js';
export { KernelSafetyLayer, type SafetyViolation, type SafetyConfig, type LicenseVerificationResult } from './safety/KernelSafetyLayer.js';
export { KernelLogger, type LogLevel, type LogEntry, type LoggerOptions } from './logging/KernelLogger.js';
export { KernelCommandInterface, type CommandRequest, type CommandResponse, type CommandHandler } from './commands/KernelCommandInterface.js';

// Telemetry Multiplexer Exports
export {
  TelemetryMultiplexer,
  PtpTimestampSyncEngine,
  AdaptiveDeJitterBuffer,
  DeadbandFilter,
  MultiplexSubsystemMask,
  type PrimordiaMultiplexFrame,
  type MultiplexFrameHeader,
  type SimulationSlice,
  type CognitiveSlice,
  type SpatialSlice,
  type KernelVitalitySlice,
  type VectorClock,
  type ClockDomain,
  type ClockSyncSample,
  type ActorTelemetrySnapshot,
  type NiagaraParticlePayload,
  type SceneDelta,
  type SceneEntity,
  type PerceptionNode,
  type StyleMemoryPayload,
  type MemoryNodePayload,
  type TemporalClusterPayload,
  type KernelVitalityPayload,
  type TelemetryMultiplexerOptions,
  type MultiplexListener,
} from './telemetry/TelemetryMultiplexer.js';

/**
 * Bootstrap and launch the Masterplane Kernel when invoked directly
 */
export async function bootstrap(): Promise<PrimordiaKernelEngine> {
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
