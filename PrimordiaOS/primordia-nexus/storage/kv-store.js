// storage/kv-store.ts
// PrimordiaOS Key-Value Store — full implementation
// In-memory KV store with optional persistence via FileStore
import { fileStore } from "./file-store";
export class KVStore {
    memory;
    persist;
    constructor(persist = true) {
        this.memory = new Map();
        this.persist = persist;
    }
    set(key, value) {
        this.memory.set(key, value);
        if (this.persist) {
            fileStore.save(`kv-${key}`, value);
        }
    }
    get(key) {
        if (this.memory.has(key)) {
            return this.memory.get(key);
        }
        if (this.persist) {
            const loaded = fileStore.load(`kv-${key}`);
            if (loaded !== null) {
                this.memory.set(key, loaded);
                return loaded;
            }
        }
        return null;
    }
    delete(key) {
        this.memory.delete(key);
        if (this.persist) {
            fileStore.delete(`kv-${key}`);
        }
    }
    keys() {
        return Array.from(this.memory.keys());
    }
}
export const kvStore = new KVStore(true);
