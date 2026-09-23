// temporal/time-sliced-snapshots.ts
// PrimordiaOS Time-Sliced Snapshots — full implementation
// Creates snapshots for each temporal frame across realms
import { temporalAgents } from "./temporal-agent";
export class TimeSlicedSnapshots {
    slices;
    constructor() {
        this.slices = [];
    }
    capture() {
        const slice = {
            id: `slice-${Date.now()}`,
            ts: Date.now(),
            frames: {
                vision: temporalAgents.vision.current(),
                sim: temporalAgents.sim.current(),
                cloud: temporalAgents.cloud.current()
            }
        };
        this.slices.push(slice);
        return slice;
    }
    all() {
        return this.slices;
    }
    latest() {
        return this.slices[this.slices.length - 1] || null;
    }
}
export const timeSlicedSnapshots = new TimeSlicedSnapshots();
