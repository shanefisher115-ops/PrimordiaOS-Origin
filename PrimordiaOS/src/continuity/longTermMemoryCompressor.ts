// continuity/longTermMemoryCompressor.ts

import { MemoryNode, CompressedMemoryBlock } from "./types";

export interface MemoryCompressorConfig {
  maxNodesPerBlock: number;
  compressionRatio: number;
  minImportanceThreshold: number;
}

export class LongTermMemoryCompressor {
  private config: MemoryCompressorConfig;

  constructor(config: MemoryCompressorConfig) {
    this.config = config;
  }

  compress(nodes: MemoryNode[]): CompressedMemoryBlock[] {
    const blocks: CompressedMemoryBlock[] = [];

    const sorted = nodes
      .filter((n) => n.importance >= this.config.minImportanceThreshold)
      .sort((a, b) => b.importance - a.importance);

    for (let i = 0; i < sorted.length; i += this.config.maxNodesPerBlock) {
      const chunk = sorted.slice(i, i + this.config.maxNodesPerBlock);

      const compressedPayload = this.compressChunk(chunk);

      blocks.push({
        id: `compressed-block-${Date.now()}-${i}`,
        timestamp: Date.now(),
        nodeCount: chunk.length,
        payload: compressedPayload,
      });
    }

    return blocks;
  }

  private compressChunk(chunk: MemoryNode[]): string {
    const raw = JSON.stringify(chunk);
    const targetLength = Math.floor(raw.length * this.config.compressionRatio);
    return raw.substring(0, targetLength);
  }
}
