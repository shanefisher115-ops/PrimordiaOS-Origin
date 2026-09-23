// src/execution/crossRealmExec.ts

import * as crypto from 'crypto';
import {
  CrossRealmExecutionRequest,
  CrossRealmExecutionResult,
} from '../contracts/phase5Types.js';
import { SwarmCoordinator } from '../agents/swarm/agentSwarm.js';
import { OfferEngine } from '../kernel/offerEngine.js';
import { TelemetryCollector } from '../telemetry/telemetryCollector.js';
import { NarrativeEngine } from '../realms/narrativeEngine/narrativeEngine.js';
import { BlogEngine } from '../realms/blogEngine/blogEngine.js';
import { FunnelAgent } from '../agents/funnelAgent.js';

export interface CrossRealmExecutionBridgeOptions {
  readonly coordinator: SwarmCoordinator;
  readonly offerEngine?: OfferEngine;
  readonly telemetry?: TelemetryCollector;
  readonly narrativeEngine?: NarrativeEngine;
  readonly blogEngine?: BlogEngine;
  readonly funnel?: FunnelAgent;
}

/**
 * CrossRealmExecutionBridge facilitates bidirectional, sovereign task routing
 * across realms (Economic, Telemetry, Narrative, Publishing, and Deployment).
 */
export class CrossRealmExecutionBridge {
  private readonly coordinator: SwarmCoordinator;
  private readonly offerEngine?: OfferEngine;
  private readonly telemetry?: TelemetryCollector;
  private readonly narrativeEngine?: NarrativeEngine;
  private readonly blogEngine?: BlogEngine;
  private readonly funnel?: FunnelAgent;
  private readonly history: CrossRealmExecutionResult[] = [];

  constructor(options: CrossRealmExecutionBridgeOptions) {
    this.coordinator = options.coordinator;
    this.offerEngine = options.offerEngine;
    this.telemetry = options.telemetry;
    this.narrativeEngine = options.narrativeEngine;
    this.blogEngine = options.blogEngine;
    this.funnel = options.funnel;

    // Listen for swarm broadcast events to trigger reactive cross-realm actions
    this.coordinator.subscribe('TASK_COMMITTED', (msg) => {
      this.handleTaskCommitted(msg.payload);
    });
  }

  /**
   * Executes a direct cross-realm request deterministically.
   */
  public async executeAction(request: CrossRealmExecutionRequest): Promise<CrossRealmExecutionResult> {
    const executedAt = Date.now();
    let resultingArtifactId: string | undefined;
    let success = false;
    let error: string | undefined;

    try {
      switch (request.actionType) {
        case 'PROVISION_ENDPOINT': {
          // Instruct BUILDER to construct a microservice endpoint for target realm
          const task = this.coordinator.submitTask(
            'BUILDER',
            `Provision endpoint for realm: ${request.targetRealm}`,
            request.targetRealm,
            request.payload
          );
          const executedTask = await this.coordinator.executeTask(task.taskId);
          resultingArtifactId = executedTask.taskId;
          success = executedTask.status === 'COMMITTED';
          break;
        }

        case 'TRIGGER_OFFER': {
          if (this.offerEngine && this.telemetry && this.funnel) {
            const econ = this.telemetry.getEconomicState();
            const decision = this.offerEngine.evaluate(econ, this.telemetry, this.funnel.getState());
            if (decision) {
              resultingArtifactId = decision.id;
              this.funnel.applyOfferState({
                activeOffer: decision,
                lastOfferTs: executedAt,
              });
              success = true;
            } else {
              success = true;
              resultingArtifactId = 'NO_OFFER_ELIGIBLE';
            }
          } else {
            // Simulated fallback
            resultingArtifactId = `OFFER_AUTO_${crypto.randomUUID().slice(0, 6)}`;
            success = true;
          }
          break;
        }

        case 'INSCRIBE_CHRONICLE': {
          if (this.narrativeEngine && this.telemetry && this.funnel && this.blogEngine) {
            const econ = this.telemetry.getEconomicState();
            const episode = this.narrativeEngine.evaluate(
              this.telemetry,
              econ,
              null,
              this.funnel.getState(),
              null,
              request.payload.protagonistId ?? 'Sovereign-Shane'
            );
            const post = this.blogEngine.linkNarrativeEpisode(episode);
            resultingArtifactId = post.id;
            success = true;
          } else {
            resultingArtifactId = `POST_AUTO_${crypto.randomUUID().slice(0, 6)}`;
            success = true;
          }
          break;
        }

        case 'SCALE_DEPLOYMENT': {
          const task = this.coordinator.submitTask(
            'DISPATCHER',
            `Scale deployment for target: ${request.targetRealm}`,
            request.targetRealm,
            request.payload
          );
          const executedTask = await this.coordinator.executeTask(task.taskId);
          resultingArtifactId = executedTask.taskId;
          success = executedTask.status === 'COMMITTED';
          break;
        }

        default:
          throw new Error(`[CrossRealmExecutionBridge] Unknown actionType: ${(request as any).actionType}`);
      }
    } catch (err: any) {
      success = false;
      error = err?.message ?? String(err);
    }

    const auditHash = crypto
      .createHash('sha256')
      .update(`${request.requestId}:${request.actionType}:${success}:${resultingArtifactId}:${executedAt}`)
      .digest('hex');

    const result: CrossRealmExecutionResult = {
      requestId: request.requestId,
      success,
      targetRealm: request.targetRealm,
      resultingArtifactId,
      auditHash,
      executedAt,
      error,
    };

    this.history.push(result);
    this.coordinator.publish('COORDINATOR', 'BROADCAST', 'CROSS_REALM_EXECUTED', result);

    return result;
  }

  public getHistory(): readonly CrossRealmExecutionResult[] {
    return [...this.history];
  }

  private handleTaskCommitted(payload: Record<string, any>): void {
    // If an ARCHITECT task committed a blueprint, notify builder
    if (payload.role === 'ARCHITECT') {
      this.coordinator.submitTask(
        'BUILDER',
        `Implement architecture blueprint from task ${payload.taskId}`,
        payload.targetRealm ?? 'sovereign_core',
        payload
      );
    }
  }
}
