// storage/storage-engine.js
// ESM version — simple in-memory storage engine

import { storageState } from "./storage-state.js";

export const storageEngine = {
    start() {
        console.log("[Storage] Engine online");
    },

    save(key, value) {
        storageState.data[key] = {
            value,
            ts: Date.now()
        };
    },

    load(key) {
        return storageState.data[key] || null;
    },

    all() {
        return storageState.data;
    }
};
