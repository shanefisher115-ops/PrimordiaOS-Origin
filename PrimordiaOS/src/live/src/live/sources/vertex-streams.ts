export function fetchVertexStreamsSignals() {
    const now = new Date();
    return [
        {
            id: 'vertex-' + now.getTime(),
            source: 'vertex://ai-stream',
            payload: {
                realm: 'cognition',
                tokens: Math.floor(Math.random() * 500),
                score: Math.random()
            },
            receivedAt: now
        }
    ];
}
