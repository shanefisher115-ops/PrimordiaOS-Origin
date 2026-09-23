/**
 * Memory Ledger: Context memory and semantic episodic traces for agents.
 */
export class MemoryLedger {
  constructor() {
    this.memories = [];
  }

  recordMemory(context, tags = []) {
    const memoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      context,
      tags
    };
    this.memories.push(memoryItem);
    return memoryItem;
  }
}

export const memoryLedger = new MemoryLedger();
