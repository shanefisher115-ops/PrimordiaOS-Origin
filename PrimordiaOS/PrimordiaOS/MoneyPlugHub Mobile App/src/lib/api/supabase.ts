import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client.
 * Replace these placeholders with real values from your Supabase project:
 *   https://supabase.com/dashboard → Settings → API
 *
 * In production, load these from environment variables:
 *   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "YOUR_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
