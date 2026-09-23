export function fetchLocalMetricSignals() {
    const now = new Date();
    return [
        {
            id: 'local-' + now.getTime(),
            source: 'local://system',
            payload: {
                realm: 'system',
                cpu: Math.random(),
                ram: Math.random()
            },
            receivedAt: now
        }
    ];
}
