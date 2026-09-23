// osmium/snapshots.ts
// PrimordiaOS Snapshot System — full implementation
// Periodic state snapshots for temporal consistency + replay

import { osmiumLedger, LedgerEntry } from "./osmium-ledger";
import { config } from "../shared/config";
import { eventBus } from "../shared/event-bus";

export interface Snapshot {
    id: string;
    ts: number;
    entries: LedgerEntry[];
}

export class SnapshotManager {
    private snapshots: Snapshot[];
    private interval: number;
    private timer: NodeJS.Timeout | null;

    constructor() {
        this.snapshots = [];
        this.interval = config.get<number>("osmium.snapshotInterval");
        this.timer = null;
    }

    start() {
        console.log("[SnapshotManager] Started with interval:", this.interval);

        this.timer = setInterval(() => {
            this.createSnapshot();
        }, this.interval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log("[SnapshotManager] Stopped.");
    }

    createSnapshot() {
        const snapshot: Snapshot = {
            id: `snap-${Date.now()}`,
            ts: Date.now(),
            entries: [...osmiumLedger.getEntries()]
        };

        this.snapshots.push(snapshot);

        eventBus.emit("osmium.snapshot.created", snapshot, "osmium");

        console.log("[SnapshotManager] Snapshot created:", snapshot.id);
    }

    getSnapshots(): Snapshot[] {
        return this.snapshots;
    }

    getLatestSnapshot(): Snapshot | null {
        if (this.snapshots.length === 0) return null;
        return this.snapshots[this.snapshots.length - 1];
    }
}

export const snapshotManager = new SnapshotManager();
