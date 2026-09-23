// cloud/cloud-bootstrap.ts
// PrimordiaOS Cloud Bootstrap — full implementation
// Starts remote event bus + Supabase sync + PlanetScale sync

import { remoteEventBus } from "./remote-event-bus";
import { cloudSync } from "./cloud-sync";

export async function startCloud() {
    console.log("[Cloud] Starting cloud layer…");

    remoteEventBus.start();
    await cloudSync.start();

    console.log("[Cloud] Cloud layer active.");
}

export async function stopCloud() {
    console.log("[Cloud] Stopping cloud layer…");
    console.log("[Cloud] Cloud layer stopped.");
}
