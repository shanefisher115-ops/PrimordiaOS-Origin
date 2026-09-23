// temporal/temporal-state.js
// ESM version — wrapper for temporal state objects

export class TemporalState {
    constructor(data = {}) {
        this.data = data;
        this.ts = Date.now();
    }

    update(newData = {}) {
        this.data = { ...this.data, ...newData };
        this.ts = Date.now();
    }

    snapshot() {
        return {
            ts: this.ts,
            data: this.data
        };
    }
}
