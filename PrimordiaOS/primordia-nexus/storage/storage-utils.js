// storage/storage-utils.js
// ESM version — helper utilities for storage

export const storageUtils = {
    stamp(payload = {}) {
        return {
            ...payload,
            ts: Date.now()
        };
    }
};
