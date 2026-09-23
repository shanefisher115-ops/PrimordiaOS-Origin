export function fetchCloudflareWorkerSignals() {
    const now = new Date();
    return [
        {
            id: 'cf-worker-' + now.getTime(),
            source: 'cloudflare://worker',
            payload: {
                realm: 'edge',
                requests: Math.floor(Math.random() * 1000)
            },
            receivedAt: now
        }
    ];
}
