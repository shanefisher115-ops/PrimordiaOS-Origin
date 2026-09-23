// devtools/devtools-utils.js
// ESM version — helper utilities for devtools

export const devtoolsUtils = {
    stamp(payload = {}) {
        return {
            ...payload,
            ts: Date.now()
        };
    }
};
