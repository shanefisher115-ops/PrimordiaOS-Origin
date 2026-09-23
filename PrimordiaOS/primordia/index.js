import { processSignal } from "../primordia/PAIA";
export const PrimordiaOS = {
    subsystems: [],
    ingest(signal) {
        processSignal(this, signal);
    }
};
