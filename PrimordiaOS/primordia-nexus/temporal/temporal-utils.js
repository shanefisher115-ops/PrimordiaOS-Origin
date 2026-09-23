// temporal/temporal-utils.js
// ESM version — helper utilities for temporal operations

export function now() {
    return Date.now();
}

export function diff(a, b) {
    return Math.abs(a - b);
}

export function stamp(payload = {}) {
    return {
        ...payload,
        ts: Date.now()
    };
}
