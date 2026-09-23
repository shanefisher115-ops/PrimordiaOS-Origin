// network/network-router.js
// ESM version — simple route registry

import { networkState } from "./network-state.js";

export const networkRouter = {
    start() {
        console.log("[Network] Router online");
    },

    addRoute(path, handler) {
        networkState.routes.push({
            path,
            handler,
            ts: Date.now()
        });
    },

    resolve(path) {
        return networkState.routes.find(r => r.path === path) || null;
    }
};
