// cloud/cloud-sync.ts
// PrimordiaOS Cloud Sync — full implementation
// Syncs local ledger + snapshots to Supabase + PlanetScale
import { eventBus } from "../primordia-core/shared/event-bus";
import { supabaseSync } from "./supabase-client";
import { planetScaleDB } from "./planetscale-db";
export class CloudSync {
    async start() {
        console.log("[CloudSync] Starting…");
        await planetScaleDB.connect();
        // Sync snapshots
        eventBus.subscribe("vision.snapshot.created", async (event) => {
            await supabaseSync.pushSnapshot(event.payload);
            await planetScaleDB.saveSnapshot(event.payload);
        });
        // Sync ledger entries
        eventBus.subscribe("*", async (event) => {
            const entry = {
                id: `ledger-${event.timestamp}`,
                ts: event.timestamp,
                event
            };
            await planetScaleDB.saveLedgerEntry(entry);
        });
        console.log("[CloudSync] Cloud sync active.");
    }
}
export const cloudSync = new CloudSync();
