import { db } from '../db/supabase';
import { Logger } from '../core/logger';
export const SupabaseService = {
    async insertConversion(data) {
        const client = db();
        const { error } = await client.from('conversions').insert(data);
        if (error) {
            Logger.error('Supabase insertConversion error', { error: error.message });
        }
        else {
            Logger.info('Supabase conversion inserted');
        }
    },
};
