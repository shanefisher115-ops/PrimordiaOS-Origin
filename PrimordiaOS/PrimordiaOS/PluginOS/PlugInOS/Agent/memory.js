// agent/memory.js
import { createClient } from "@supabase/supabase-js";

export const memory = {
  supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY),

  async read(table, filter) {
    return await this.supabase.from(table).select("*").match(filter);
  },

  async write(table, data) {
    return await this.supabase.from(table).upsert(data);
  }
};