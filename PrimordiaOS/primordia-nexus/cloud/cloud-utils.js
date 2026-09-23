// cloud/cloud-utils.js
// ESM version — helper utilities for cloud operations

export const cloudUtils = {
    async delay(ms = 50) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    stamp(payload = {}) {
        return {
            ...payload,
            ts: Date.now()
        };
    }
};

