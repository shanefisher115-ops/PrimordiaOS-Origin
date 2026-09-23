/**
 * @file MemoryEdge.ts
 * @description Directed and weighted relationship between MemoryNodes in PrimordiaOS.
 * Supports semantic, temporal, spatial, causal, and subordinate edge types.
 */

import { randomUUID } from 'node:crypto';

export type MemoryEdgeType =
  | 'semantic'
  | 'temporal'
  | 'spatial'
  | 'causal'
  | 'subordinate'
  | 'correlative';

export interface MemoryEdgeData {
  id: string;
  sourceId: string;
  targetId: string;
  type: MemoryEdgeType;
  weight: number;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface CreateMemoryEdgeParams {
  id?: string;
  sourceId: string;
  targetId: string;
  type: MemoryEdgeType;
  weight?: number;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export class MemoryEdge implements MemoryEdgeData {
  public readonly id: string;
  public readonly sourceId: string;
  public readonly targetId: string;
  public type: MemoryEdgeType;
  public weight: number;
  public metadata: Record<string, unknown>;
  public timestamp: number;

  constructor(params: CreateMemoryEdgeParams) {
    if (!params.sourceId || !params.targetId) {
      throw new Error('MemoryEdge requires valid sourceId and targetId');
    }
    this.id = params.id || randomUUID();
    this.sourceId = params.sourceId;
    this.targetId = params.targetId;
    this.type = params.type;
    this.weight = Math.max(0, Math.min(1, params.weight ?? 1.0));
    this.metadata = params.metadata ? { ...params.metadata } : {};
    this.timestamp = params.timestamp ?? Date.now();
  }

  public setWeight(newWeight: number): void {
    this.weight = Math.max(0, Math.min(1, newWeight));
  }

  public toJSON(): MemoryEdgeData {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      type: this.type,
      weight: this.weight,
      metadata: { ...this.metadata },
      timestamp: this.timestamp,
    };
  }

  public static fromJSON(json: MemoryEdgeData): MemoryEdge {
    return new MemoryEdge({
      id: json.id,
      sourceId: json.sourceId,
      targetId: json.targetId,
      type: json.type,
      weight: json.weight,
      metadata: json.metadata,
      timestamp: json.timestamp,
    });
  }
}
