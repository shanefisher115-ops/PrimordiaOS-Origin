// cloud/supabase-client.ts
// PrimordiaOS Supabase Sync — full implementation
// Remote KV + table sync for distributed state

import { createClient } from "@supabase/supabase-js";

export class SupabaseSync {
    private client;

    constructor(url: string, key: string) {
        this.client = createClient(url, key);
    }

    async setKV(key: string, value: any) {
        await this.client
            .from("kv_store")
            .upsert({ key, value });
    }

    async getKV(key: string) {
        const { data } = await this.client
            .from("kv_store")
            .select("*")
            .eq("key", key)
            .single();

        return data?.value ?? null;
    }

    async pushSnapshot(snapshot: any) {
        await this.client
            .from("snapshots")
            .insert({
                id: snapshot.id,
                ts: snapshot.ts,
                nodes: snapshot.nodes
            });
    }
}

export const supabaseSync = new SupabaseSync(
    "https://your-supabase-url.supabase.co",
    "your-supabase-key"
);
