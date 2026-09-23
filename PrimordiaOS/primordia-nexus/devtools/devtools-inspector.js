// devtools/devtools-inspector.js
// ESM version — simple runtime inspector

import { devtoolsState } from "./devtools-state.js";

export const devtoolsInspector = {
    start() {
        console.log("[Devtools] Inspector online");
    },

    inspect(obj) {
        if (!devtoolsState.enabled) return null;

        return {
            ts: Date.now(),
            keys: Object.keys(obj),
            preview: JSON.stringify(obj).slice(0, 200)
        };
    }
};
