// storage/persistent-state.ts
// PrimordiaOS Persistent State Store — full implementation
// Stores long-term system state snapshots and metadata
import { fileStore } from "./file-store";
export class PersistentStateStore {
    states;
    constructor() {
        this.states = fileStore.load("persistent-states") || [];
    }
    addState(data) {
        const state = {
            id: `state-${Date.now()}`,
            ts: Date.now(),
            data
        };
        this.states.push(state);
        this.save();
        return state;
    }
    getStates() {
        return this.states;
    }
    getLatest() {
        if (this.states.length === 0)
            return null;
        return this.states[this.states.length - 1];
    }
    save() {
        fileStore.save("persistent-states", this.states);
    }
}
export const persistentStateStore = new PersistentStateStore();
