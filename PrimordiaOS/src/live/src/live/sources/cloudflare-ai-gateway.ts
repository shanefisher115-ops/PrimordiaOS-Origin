export function fetchCloudflareAISignals() {
    const now = new Date();
    return [
        {
            id: 'cf-ai-' + now.getTime(),
            source: 'cloudflare://ai-gateway',
            payload: {
                realm: 'ai',
                model: 'stub-model',
                score: Math.random()
            },
            receivedAt: now
        }
    ];
}
