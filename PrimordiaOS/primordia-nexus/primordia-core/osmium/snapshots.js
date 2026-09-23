// osmium/snapshots.ts
// PrimordiaOS Snapshot System — full implementation
// Periodic state snapshots for temporal consistency + replay
import { osmiumLedger } from "./osmium-ledger";
import { config } from "../shared/config";
import { eventBus } from "../shared/event-bus";
export class SnapshotManager {
    snapshots;
    interval;
    timer;
    constructor() {
        this.snapshots = [];
        this.interval = config.get("osmium.snapshotInterval");
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
        const snapshot = {
            id: `snap-${Date.now()}`,
            ts: Date.now(),
            entries: [...osmiumLedger.getEntries()]
        };
        this.snapshots.push(snapshot);
        eventBus.emit("osmium.snapshot.created", snapshot, "osmium");
        console.log("[SnapshotManager] Snapshot created:", snapshot.id);
    }
    getSnapshots() {
        return this.snapshots;
    }
    getLatestSnapshot() {
        if (this.snapshots.length === 0)
            return null;
        return this.snapshots[this.snapshots.length - 1];
    }
}
export const snapshotManager = new SnapshotManager();
