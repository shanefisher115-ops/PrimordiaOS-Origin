/**
 * @file MemorySafetyLayer.ts
 * @description Safety, quarantine, and structural integrity layer for PrimordiaOS Spatial Memory.
 * Guardrails against spatial corruption, infinite cycles, out-of-bounds vectors, and unsafe memory nodes.
 */

import { MemoryNode, SpatialVector3 } from '../graph/MemoryNode.js';
import { MemoryEdge } from '../graph/MemoryEdge.js';
import { MemoryLogger } from '../logging/MemoryLogger.js';

export interface SafetyPolicy {
  maxNodes: number;
  maxEdges: number;
  maxContentLength: number;
  maxCoordinateMagnitude: number;
  maxGraphTraversalDepth: number;
  blockedPatterns: RegExp[];
  enforceQuarantineOnPatternMatch: boolean;
}

export const DEFAULT_SAFETY_POLICY: SafetyPolicy = {
  maxNodes: 100_000,
  maxEdges: 500_000,
  maxContentLength: 64 * 1024, // 64 KB per node content
  maxCoordinateMagnitude: 10_000_000, // 10 million units bounding sphere
  maxGraphTraversalDepth: 64,
  blockedPatterns: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /__proto__/gi,
    /constructor\.prototype/gi,
  ],
  enforceQuarantineOnPatternMatch: true,
};

export class MemorySafetyLayer {
  private readonly policy: SafetyPolicy;
  private readonly logger: MemoryLogger;
  private readonly quarantinedNodeIds: Set<string> = new Set();
  private readonly quarantineLog: Map<string, { reason: string; timestamp: number }> = new Map();

  constructor(policyPartial?: Partial<SafetyPolicy>, logger?: MemoryLogger) {
    this.policy = { ...DEFAULT_SAFETY_POLICY, ...policyPartial };
    this.logger = logger ?? new MemoryLogger({ component: 'MemorySafetyLayer' });
  }

  public validateCoordinates(coords: SpatialVector3): { valid: boolean; reason?: string } {
    if (
      !Number.isFinite(coords.x) ||
      !Number.isFinite(coords.y) ||
      !Number.isFinite(coords.z)
    ) {
      return { valid: false, reason: 'Coordinates contain NaN or non-finite values' };
    }

    const mag = Math.sqrt(coords.x * coords.x + coords.y * coords.y + coords.z * coords.z);
    if (mag > this.policy.maxCoordinateMagnitude) {
      return {
        valid: false,
        reason: `Coordinate magnitude (${mag.toFixed(2)}) exceeds maximum allowed limit (${this.policy.maxCoordinateMagnitude})`,
      };
    }

    return { valid: true };
  }

  public validateNode(
    node: MemoryNode,
    currentNodeCount: number
  ): { valid: boolean; quarantine: boolean; reason?: string } {
    if (currentNodeCount >= this.policy.maxNodes) {
      return {
        valid: false,
        quarantine: false,
        reason: `Memory node capacity limit reached (${this.policy.maxNodes} nodes)`,
      };
    }

    const coordCheck = this.validateCoordinates(node.coordinates);
    if (!coordCheck.valid) {
      return { valid: false, quarantine: true, reason: coordCheck.reason };
    }

    if (node.content.length > this.policy.maxContentLength) {
      return {
        valid: false,
        quarantine: false,
        reason: `Node content length (${node.content.length}) exceeds max limit (${this.policy.maxContentLength})`,
      };
    }

    for (const pattern of this.policy.blockedPatterns) {
      if (pattern.test(node.content)) {
        this.logger.warn(`Potential malicious pattern detected in node [${node.id}]`, {
          pattern: pattern.toString(),
          nodeId: node.id,
        });
        if (this.policy.enforceQuarantineOnPatternMatch) {
          return {
            valid: true,
            quarantine: true,
            reason: `Malicious pattern match detected: ${pattern.toString()}`,
          };
        }
      }
    }

    return { valid: true, quarantine: false };
  }

  public validateEdge(
    edge: MemoryEdge,
    currentEdgeCount: number
  ): { valid: boolean; reason?: string } {
    if (currentEdgeCount >= this.policy.maxEdges) {
      return {
        valid: false,
        reason: `Memory edge capacity limit reached (${this.policy.maxEdges} edges)`,
      };
    }

    if (edge.sourceId === edge.targetId) {
      return { valid: false, reason: 'Self-referential edges are disallowed in standard memory topology' };
    }

    if (this.isQuarantined(edge.sourceId) || this.isQuarantined(edge.targetId)) {
      return {
        valid: false,
        reason: 'Cannot create edge linked to quarantined memory node',
      };
    }

    return { valid: true };
  }

  public quarantineNode(nodeId: string, reason: string): void {
    this.quarantinedNodeIds.add(nodeId);
    this.quarantineLog.set(nodeId, { reason, timestamp: Date.now() });
    this.logger.warn(`Node quarantined: ${nodeId}`, { nodeId, reason });
  }

  public releaseFromQuarantine(nodeId: string): boolean {
    if (this.quarantinedNodeIds.has(nodeId)) {
      this.quarantinedNodeIds.delete(nodeId);
      this.quarantineLog.delete(nodeId);
      this.logger.info(`Node released from quarantine: ${nodeId}`, { nodeId });
      return true;
    }
    return false;
  }

  public isQuarantined(nodeId: string): boolean {
    return this.quarantinedNodeIds.has(nodeId);
  }

  public getQuarantineInfo(nodeId: string): { reason: string; timestamp: number } | undefined {
    return this.quarantineLog.get(nodeId);
  }

  public getAllQuarantined(): Array<{ nodeId: string; reason: string; timestamp: number }> {
    return Array.from(this.quarantineLog.entries()).map(([nodeId, data]) => ({
      nodeId,
      ...data,
    }));
  }

  public getMaxTraversalDepth(): number {
    return this.policy.maxGraphTraversalDepth;
  }
}
