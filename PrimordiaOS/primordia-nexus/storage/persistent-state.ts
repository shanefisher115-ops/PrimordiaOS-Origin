// storage/persistent-state.ts
// PrimordiaOS Persistent State Store — full implementation
// Stores long-term system state snapshots and metadata

import { fileStore } from "./file-store";

export interface PersistentState {
    id: string;
    ts: number;
    data: any;
}

export class PersistentStateStore {
    private states: PersistentState[];

    constructor() {
        this.states = fileStore.load<PersistentState[]>("persistent-states") || [];
    }

    addState(data: any) {
        const state: PersistentState = {
            id: `state-${Date.now()}`,
            ts: Date.now(),
            data
        };

        this.states.push(state);
        this.save();
        return state;
    }

    getStates(): PersistentState[] {
        return this.states;
    }

    getLatest(): PersistentState | null {
        if (this.states.length === 0) return null;
        return this.states[this.states.length - 1];
    }

    private save() {
        fileStore.save("persistent-states", this.states);
    }
}

export const persistentStateStore = new PersistentStateStore();
