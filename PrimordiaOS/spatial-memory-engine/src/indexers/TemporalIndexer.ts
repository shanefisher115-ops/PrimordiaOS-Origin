/**
 * @file TemporalIndexer.ts
 * @description Chronological and time-series indexer for MemoryNodes in PrimordiaOS.
 * Supports temporal range queries, binary search lookup, exponential decay scoring,
 * and burst clustering (episodic grouping).
 */

import { MemoryNode } from '../graph/MemoryNode.js';
import { MemoryLogger } from '../logging/MemoryLogger.js';

export interface TemporalCluster {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  nodeCount: number;
  nodeIds: string[];
}

export class TemporalIndexer {
  // Sorted list of nodes by timestamp ascending: Array<{ timestamp: number; node: MemoryNode }>
  private timeline: Array<{ timestamp: number; node: MemoryNode }> = [];
  private readonly indexedMap: Map<string, number> = new Map(); // nodeId -> timestamp
  private readonly logger: MemoryLogger;

  constructor(logger?: MemoryLogger) {
    this.logger = logger ?? new MemoryLogger({ component: 'TemporalIndexer' });
  }

  public indexNode(node: MemoryNode): void {
    if (this.indexedMap.has(node.id)) {
      this.unindexNode(node.id);
    }

    const item = { timestamp: node.timestamp, node };
    this.indexedMap.set(node.id, node.timestamp);

    // Binary search insertion to keep timeline sorted ascending
    let low = 0;
    let high = this.timeline.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timeline[mid].timestamp < item.timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.timeline.splice(low, 0, item);
  }

  public unindexNode(nodeId: string): boolean {
    if (!this.indexedMap.has(nodeId)) return false;

    this.indexedMap.delete(nodeId);
    const idx = this.timeline.findIndex(entry => entry.node.id === nodeId);
    if (idx !== -1) {
      this.timeline.splice(idx, 1);
      return true;
    }
    return false;
  }

  public clear(): void {
    this.timeline = [];
    this.indexedMap.clear();
  }

  public findBetween(startTime: number, endTime: number): MemoryNode[] {
    if (this.timeline.length === 0 || startTime > endTime) {
      return [];
    }

    // Find start index (binary search)
    let low = 0;
    let high = this.timeline.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.timeline[mid].timestamp < startTime) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    const startIdx = low;

    // Collect matching nodes up to endTime
    const results: MemoryNode[] = [];
    for (let i = startIdx; i < this.timeline.length; i++) {
      if (this.timeline[i].timestamp > endTime) {
        break;
      }
      results.push(this.timeline[i].node);
    }

    return results;
  }

  public findRecent(limit = 20): MemoryNode[] {
    const start = Math.max(0, this.timeline.length - limit);
    const sliced = this.timeline.slice(start);
    // Return newest first
    return sliced.reverse().map(entry => entry.node);
  }

  public calculateDecayScore(timestamp: number, halfLifeMs = 24 * 60 * 60 * 1000): number {
    const ageMs = Math.max(0, Date.now() - timestamp);
    // Exponential half-life decay: 2^(-age / halfLife)
    const decay = Math.pow(2, -ageMs / halfLifeMs);
    return Number(decay.toFixed(4));
  }

  public computeBursts(maxDeltaBetweenNodesMs = 60_000, minNodesPerBurst = 2): TemporalCluster[] {
    if (this.timeline.length < minNodesPerBurst) {
      return [];
    }

    const clusters: TemporalCluster[] = [];
    let currentBurst: MemoryNode[] = [this.timeline[0].node];
    let clusterIdx = 1;

    for (let i = 1; i < this.timeline.length; i++) {
      const prev = this.timeline[i - 1].node;
      const curr = this.timeline[i].node;
      const delta = curr.timestamp - prev.timestamp;

      if (delta <= maxDeltaBetweenNodesMs) {
        currentBurst.push(curr);
      } else {
        if (currentBurst.length >= minNodesPerBurst) {
          const first = currentBurst[0];
          const last = currentBurst[currentBurst.length - 1];
          clusters.push({
            id: `burst_temporal_${clusterIdx++}`,
            startTime: first.timestamp,
            endTime: last.timestamp,
            durationMs: last.timestamp - first.timestamp,
            nodeCount: currentBurst.length,
            nodeIds: currentBurst.map(n => n.id),
          });
        }
        currentBurst = [curr];
      }
    }

    if (currentBurst.length >= minNodesPerBurst) {
      const first = currentBurst[0];
      const last = currentBurst[currentBurst.length - 1];
      clusters.push({
        id: `burst_temporal_${clusterIdx++}`,
        startTime: first.timestamp,
        endTime: last.timestamp,
        durationMs: last.timestamp - first.timestamp,
        nodeCount: currentBurst.length,
        nodeIds: currentBurst.map(n => n.id),
      });
    }

    return clusters;
  }

  public getTimeSpan(): { earliest: number; latest: number; totalDurationMs: number } | null {
    if (this.timeline.length === 0) return null;
    const earliest = this.timeline[0].timestamp;
    const latest = this.timeline[this.timeline.length - 1].timestamp;
    return {
      earliest,
      latest,
      totalDurationMs: latest - earliest,
    };
  }

  public getIndexSize(): number {
    return this.timeline.length;
  }
}
