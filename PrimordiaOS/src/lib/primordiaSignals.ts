import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const subscribeToSwarmTelemetry = (onSignal: (payload: any) => void) => {
  return supabase
    .channel('primordia-swarm-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'agent_signals' },
      (payload) => onSignal(payload.new)
    )
    .subscribe();
};
