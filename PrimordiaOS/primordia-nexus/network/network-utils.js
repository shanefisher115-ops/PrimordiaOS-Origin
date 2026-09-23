// network/network-utils.js
// ESM version — helper utilities for networking

export const networkUtils = {
    stamp(payload = {}) {
        return {
            ...payload,
            ts: Date.now()
        };
    }
};
