// storage/memory-store.ts
// PrimordiaOS Memory Store — full implementation
// Pure in-memory volatile storage (no persistence)

export class MemoryStore {
    private memory: Map<string, any>;

    constructor() {
        this.memory = new Map();
    }

    set(key: string, value: any) {
        this.memory.set(key, value);
    }

    get<T = any>(key: string): T | null {
        return this.memory.get(key) ?? null;
    }

    delete(key: string) {
        this.memory.delete(key);
    }

    clear() {
        this.memory.clear();
    }

    keys(): string[] {
        return Array.from(this.memory.keys());
    }
}

export const memoryStore = new MemoryStore();
