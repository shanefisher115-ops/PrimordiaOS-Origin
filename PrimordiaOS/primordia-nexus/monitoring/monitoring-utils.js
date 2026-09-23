// monitoring/monitoring-utils.js
// ESM version — helper utilities for monitoring

export const monitoringUtils = {
    stamp(payload = {}) {
        return {
            ...payload,
            ts: Date.now()
        };
    }
};
