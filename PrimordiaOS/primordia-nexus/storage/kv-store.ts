// storage/kv-store.ts
// PrimordiaOS Key-Value Store — full implementation
// In-memory KV store with optional persistence via FileStore

import { fileStore } from "./file-store";

export class KVStore {
    private memory: Map<string, any>;
    private persist: boolean;

    constructor(persist = true) {
        this.memory = new Map();
        this.persist = persist;
    }

    set(key: string, value: any) {
        this.memory.set(key, value);
        if (this.persist) {
            fileStore.save(`kv-${key}`, value);
        }
    }

    get<T = any>(key: string): T | null {
        if (this.memory.has(key)) {
            return this.memory.get(key) as T;
        }

        if (this.persist) {
            const loaded = fileStore.load<T>(`kv-${key}`);
            if (loaded !== null) {
                this.memory.set(key, loaded);
                return loaded;
            }
        }

        return null;
    }

    delete(key: string) {
        this.memory.delete(key);
        if (this.persist) {
            fileStore.delete(`kv-${key}`);
        }
    }

    keys(): string[] {
        return Array.from(this.memory.keys());
    }
}

export const kvStore = new KVStore(true);
