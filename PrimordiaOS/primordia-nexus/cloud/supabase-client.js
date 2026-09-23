// cloud/supabase-client.ts
// PrimordiaOS Supabase Sync — full implementation
// Remote KV + table sync for distributed state
import { createClient } from "@supabase/supabase-js";
export class SupabaseSync {
    client;
    constructor(url, key) {
        this.client = createClient(url, key);
    }
    async setKV(key, value) {
        await this.client
            .from("kv_store")
            .upsert({ key, value });
    }
    async getKV(key) {
        const { data } = await this.client
            .from("kv_store")
            .select("*")
            .eq("key", key)
            .single();
        return data?.value ?? null;
    }
    async pushSnapshot(snapshot) {
        await this.client
            .from("snapshots")
            .insert({
            id: snapshot.id,
            ts: snapshot.ts,
            nodes: snapshot.nodes
        });
    }
}
export const supabaseSync = new SupabaseSync("https://your-supabase-url.supabase.co", "your-supabase-key");
