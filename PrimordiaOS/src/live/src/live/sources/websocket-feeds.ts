export function fetchWebSocketSignals() {
    const now = new Date();
    return [
        {
            id: 'ws-' + now.getTime(),
            source: 'ws://feed',
            payload: {
                realm: 'stream',
                topic: 'example',
                value: Math.random()
            },
            receivedAt: now
        }
    ];
}
