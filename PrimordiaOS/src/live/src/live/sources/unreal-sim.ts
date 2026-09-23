export function fetchUnrealSimSignals() {
    const now = new Date();
    return [
        {
            id: 'unreal-' + now.getTime(),
            source: 'unreal://simulation',
            payload: {
                realm: 'simulation',
                actors: Math.floor(Math.random() * 100),
                tickRate: 60
            },
            receivedAt: now
        }
    ];
}
