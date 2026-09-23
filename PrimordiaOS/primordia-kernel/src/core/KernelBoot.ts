/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelBoot.ts - Verifiable phase-by-phase boot sequence orchestrator
 */

import { KernelLogger } from '../logging/KernelLogger.js';
import { KernelSafetyLayer } from '../safety/KernelSafetyLayer.js';
import { KernelMemoryEngine } from '../memory/KernelMemoryEngine.js';
import { RealmRegistry } from '../registry/RealmRegistry.js';
import { EventBus } from '../eventbus/EventBus.js';
import { IPCRouter } from '../ipc/IPCRouter.js';
import { KernelTaskScheduler } from '../scheduler/KernelTaskScheduler.js';
import { KernelHeartbeat } from './KernelHeartbeat.js';

export interface BootContext {
  logger: KernelLogger;
  safety: KernelSafetyLayer;
  memory: KernelMemoryEngine;
  registry: RealmRegistry;
  eventBus: EventBus;
  ipc: IPCRouter;
  scheduler: KernelTaskScheduler;
  heartbeat: KernelHeartbeat;
}

export interface BootStepReport {
  phase: string;
  durationMs: number;
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

export class KernelBoot {
  private logger: KernelLogger;

  constructor(logger: KernelLogger) {
    this.logger = logger.forSubsystem('boot');
  }

  public async executeBootSequence(context: BootContext): Promise<BootStepReport[]> {
    const reports: BootStepReport[] = [];
    this.logger.info('====================================================');
    this.logger.info('   PRIMORDIA-OS SOVEREIGN MASTERPLANE BOOT SEQUENCE   ');
    this.logger.info('====================================================');

    // Phase 1: Environment Sanity
    await this.runStep('01_ENVIRONMENT_INSPECTION', reports, async () => {
      const nodeVersion = process.version;
      const platform = process.platform;
      const envKeyPresent = !!process.env.PRIMORDIAOS_KEY;
      const port = process.env.PORT || '8080';

      this.logger.info(`Node.js Runtime: ${nodeVersion} | Platform: ${platform} | Port: ${port}`);
      return { nodeVersion, platform, envKeyPresent, port };
    });

    // Phase 2: Safety & License Verification
    await this.runStep('02_SAFETY_LICENSE_AUDIT', reports, async () => {
      const license = context.safety.verifyLicenseKey();
      this.logger.info(`License Tier: [${license.tier}] - ${license.message}`);
      return { tier: license.tier, valid: license.valid };
    });

    // Phase 3: Memory Substrate Restoration
    await this.runStep('03_MEMORY_SUBSTRATE_HYDRATION', reports, async () => {
      const loaded = await context.memory.loadFromDisk();
      const count = context.memory.getRecordCount();
      const version = context.memory.getGlobalVersion();
      this.logger.info(`Memory Substrate ready: ${count} records restored (v${version}, diskLoaded: ${loaded})`);
      return { recordsRestored: count, globalVersion: version, fromDisk: loaded };
    });

    // Phase 4: Realm Registry Activation
    await this.runStep('04_REALM_REGISTRY_INITIALIZATION', reports, async () => {
      context.registry.registerDefaultRealms();
      await context.registry.loadFromDisk();
      const realms = context.registry.listRealms();
      this.logger.info(`Mounted ${realms.length} active sovereign realms.`);
      return { mountedRealms: realms.map(r => r.id) };
    });

    // Phase 5: EventBus Interconnect
    await this.runStep('05_EVENTBUS_INTERCONNECT', reports, async () => {
      context.eventBus.subscribe('kernel.**', event => {
        context.logger.trace(`Global bus observed event [${event.topic}] from ${event.source}`);
      });
      await context.eventBus.emit('kernel.boot.stage', { stage: 'EVENTBUS_READY' }, 'kernel:boot');
      return { subscribers: context.eventBus.getSubscriptionCount() };
    });

    // Phase 6: IPC Routing Fabrics
    await this.runStep('06_IPC_ROUTING_ESTABLISHMENT', reports, async () => {
      // Wire default echo / ping handlers across registered realms
      for (const realm of context.registry.listRealms()) {
        context.ipc.registerHandler(realm.id, 'control', 'ping', async env => {
          return { echo: 'pong', target: env.targetRealm, timestamp: new Date().toISOString() };
        });
      }
      return { registeredRealms: context.registry.listRealms().length };
    });

    // Phase 7: Task Scheduler Ignition
    await this.runStep('07_TASK_SCHEDULER_SPINUP', reports, async () => {
      // Submit initial background maintenance loop (every 60s)
      context.scheduler.scheduleInterval('memory-checkpoint', 60000, async () => {
        await context.memory.persistToDisk();
      });
      return { schedulerActive: true };
    });

    // Phase 8: Vitality Heartbeat Pulse Ignition
    await this.runStep('08_HEARTBEAT_VITALITY_IGNITION', reports, async () => {
      context.heartbeat.start();
      const firstPulse = await context.heartbeat.pulse();
      return { initialPulse: firstPulse.pulseCount, worldState: firstPulse.worldState };
    });

    this.logger.info('====================================================');
    this.logger.info('   PRIMORDIA-OS MASTERPLANE KERNEL BOOT COMPLETED     ');
    this.logger.info('====================================================');

    return reports;
  }

  private async runStep(
    phase: string,
    reports: BootStepReport[],
    stepFn: () => Promise<Record<string, unknown>>
  ): Promise<void> {
    const start = Date.now();
    this.logger.logBoot(phase, 'STARTING');
    try {
      const details = await stepFn();
      const durationMs = Date.now() - start;
      this.logger.logBoot(phase, 'SUCCESS', { durationMs, ...details });
      reports.push({ phase, durationMs, success: true, details });
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.logBoot(phase, 'FAILED', { durationMs, error: errorMsg });
      reports.push({ phase, durationMs, success: false, error: errorMsg });
      throw new Error(`Boot sequence aborted at phase "${phase}": ${errorMsg}`);
    }
  }
}
