export function fetchSupabaseSignals() {
    const now = new Date();
    return [
        {
            id: 'supabase-' + now.getTime(),
            source: 'supabase://realtime',
            payload: {
                realm: 'data',
                event: 'stub',
                table: 'example',
                op: 'insert'
            },
            receivedAt: now
        }
    ];
}
