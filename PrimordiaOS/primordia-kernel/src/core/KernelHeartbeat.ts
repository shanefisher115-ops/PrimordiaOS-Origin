/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelHeartbeat.ts - Periodic vitality pulse generator, telemetry aggregator, and realm health sentinel
 */

import { KernelLogger } from '../logging/KernelLogger.js';
import { RealmRegistry, RealmDescriptor } from '../registry/RealmRegistry.js';
import { EventBus } from '../eventbus/EventBus.js';
import { KernelMemoryEngine } from '../memory/KernelMemoryEngine.js';

export type WorldStateEquilibrium = 'STABLE' | 'FLUX' | 'CHARGED' | 'DEGRADED';

export interface VitalityMetrics {
  pulseCount: number;
  uptimeSeconds: number;
  worldState: WorldStateEquilibrium;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  realms: {
    total: number;
    active: number;
    degraded: number;
    offline: number;
  };
  eventBusSubscriptions: number;
  timestamp: string;
}

export class KernelHeartbeat {
  private logger: KernelLogger;
  private registry: RealmRegistry;
  private eventBus: EventBus;
  private memoryEngine: KernelMemoryEngine;
  private intervalMs: number;
  private timerRef?: NodeJS.Timeout;
  private pulseCount = 0;
  private startTime = Date.now();
  private currentWorldState: WorldStateEquilibrium = 'STABLE';

  constructor(
    logger: KernelLogger,
    registry: RealmRegistry,
    eventBus: EventBus,
    memoryEngine: KernelMemoryEngine,
    intervalMs = 3000
  ) {
    this.logger = logger.forSubsystem('heartbeat');
    this.registry = registry;
    this.eventBus = eventBus;
    this.memoryEngine = memoryEngine;
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.timerRef) return;
    this.startTime = Date.now();
    this.timerRef = setInterval(() => this.pulse(), this.intervalMs);
    this.logger.info(`Kernel Heartbeat initialized (interval: ${this.intervalMs}ms)`);
  }

  public stop(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = undefined;
      this.logger.info('Kernel Heartbeat stopped.');
    }
  }

  public async pulse(): Promise<VitalityMetrics> {
    this.pulseCount++;
    const mem = process.memoryUsage();
    const realms = this.registry.listRealms();

    const activeCount = realms.filter(r => r.status === 'ACTIVE').length;
    const degradedCount = realms.filter(r => r.status === 'DEGRADED').length;
    const offlineCount = realms.filter(r => r.status === 'OFFLINE' || r.status === 'SUSPENDED').length;

    // Evaluate WorldState equilibrium
    if (degradedCount > 0 || offlineCount > 1) {
      this.currentWorldState = 'DEGRADED';
    } else if (mem.heapUsed / 1024 / 1024 > 500) {
      this.currentWorldState = 'FLUX';
    } else {
      this.currentWorldState = 'STABLE';
    }

    const metrics: VitalityMetrics = {
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

  public setWorldState(state: WorldStateEquilibrium): void {
    this.currentWorldState = state;
    this.logger.info(`WorldState forced to: ${state}`);
  }

  public getLatestMetrics(): VitalityMetrics {
    const cached = this.memoryEngine.get<VitalityMetrics>('kernel', 'vitality');
    if (cached) return cached;

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
        active: this.registry.listRealms().filter((r: RealmDescriptor) => r.status === 'ACTIVE').length,
        degraded: 0,
        offline: 0,
      },
      eventBusSubscriptions: this.eventBus.getSubscriptionCount(),
      timestamp: new Date().toISOString(),
    };
  }
}
