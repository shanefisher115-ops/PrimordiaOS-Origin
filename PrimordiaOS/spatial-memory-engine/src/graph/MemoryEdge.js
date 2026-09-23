/**
 * @file MemoryEdge.ts
 * @description Directed and weighted relationship between MemoryNodes in PrimordiaOS.
 * Supports semantic, temporal, spatial, causal, and subordinate edge types.
 */
import { randomUUID } from 'node:crypto';
export class MemoryEdge {
    id;
    sourceId;
    targetId;
    type;
    weight;
    metadata;
    timestamp;
    constructor(params) {
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
    setWeight(newWeight) {
        this.weight = Math.max(0, Math.min(1, newWeight));
    }
    toJSON() {
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
    static fromJSON(json) {
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
