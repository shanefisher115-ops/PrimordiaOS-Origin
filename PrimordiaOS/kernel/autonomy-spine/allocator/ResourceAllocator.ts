// ======================================================
// PRIMORDIAOS — RESOURCE ALLOCATOR
// ======================================================
// Responsibilities:
// - Deterministic CPU/GPU/memory allocation
// - Realm-aware compute pools
// - Agent-aware quotas
// - Sovereignty-based priority weighting
// - Replay-safe resource mapping
// ======================================================

export interface AllocationResult {
    cpu: number;
    gpu: number;
    memory: number;
    seed: number;          // deterministic replay seed
    timestamp: number;
}

export class ResourceAllocator {
    private realmPools: Map<string, any> = new Map();
    private agentQuotas: Map<string, any> = new Map();

    constructor() {
        // ------------------------------------------------------
        // REALM COMPUTE POOLS
        // ------------------------------------------------------
        this.realmPools.set("sovereign-realm", { cpu: 64, gpu: 8, memory: 256 });
        this.realmPools.set("academic-realm", { cpu: 32, gpu: 4, memory: 128 });
        this.realmPools.set("corporate-realm", { cpu: 24, gpu: 2, memory: 64 });
        this.realmPools.set("open-realm", { cpu: 8, gpu: 0, memory: 16 });

        // ------------------------------------------------------
        // DEFAULT AGENT QUOTAS
        // ------------------------------------------------------
        this.agentQuotas.set("default", { cpu: 2, gpu: 0, memory: 4 });
        this.agentQuotas.set("high", { cpu: 4, gpu: 1, memory: 8 });
        this.agentQuotas.set("sovereign", { cpu: 8, gpu: 2, memory: 16 });
    }

    // ------------------------------------------------------
    // MAIN ENTRYPOINT — ALLOCATE RESOURCES
    // ------------------------------------------------------
    allocate(task: any): AllocationResult {
        const realmPool = this.realmPools.get(task.realm);
        if (!realmPool) {
            throw new Error(`Unknown realm: ${task.realm}`);
        }

        const quota = this.agentQuotas.get(task.sovereignty) || this.agentQuotas.get("default");

        // Deterministic allocation based on sovereignty + realm
        const cpu = Math.min(quota.cpu, realmPool.cpu);
        const gpu = Math.min(quota.gpu, realmPool.gpu);
        const memory = Math.min(quota.memory, realmPool.memory);

        // Deterministic replay seed
        const seed = this.generateSeed(task);

        return {
            cpu,
            gpu,
            memory,
            seed,
            timestamp: Date.now()
        };
    }

    // ------------------------------------------------------
    // DETERMINISTIC SEED GENERATION
    // ------------------------------------------------------
    private generateSeed(task: any): number {
        const base = task.id ? task.id.length : 7;
        const sovereigntyWeight = task.sovereignty.length;
        const realmWeight = task.realm.length;

        return (base * 31 + sovereigntyWeight * 17 + realmWeight * 13) % 9973;
    }
}
