// storage/memory-store.ts
// PrimordiaOS Memory Store — full implementation
// Pure in-memory volatile storage (no persistence)
export class MemoryStore {
    memory;
    constructor() {
        this.memory = new Map();
    }
    set(key, value) {
        this.memory.set(key, value);
    }
    get(key) {
        return this.memory.get(key) ?? null;
    }
    delete(key) {
        this.memory.delete(key);
    }
    clear() {
        this.memory.clear();
    }
    keys() {
        return Array.from(this.memory.keys());
    }
}
export const memoryStore = new MemoryStore();
