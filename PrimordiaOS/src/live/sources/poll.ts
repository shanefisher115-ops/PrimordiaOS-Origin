export function fetchRawSignals() {
    const now = new Date();
    const realms = ['core', 'edge', 'quantum', 'memory', 'io'];

    const signals = [];

    for (const realm of realms) {
        const energy = Math.random() * Math.random();
        const pressure = Math.sin(Date.now() / 5000) * 0.5 + 0.5;
        const turbulence = Math.random() * pressure;

        signals.push({
            id: 'sig-' + now.getTime() + '-' + realm,
            source: 'primordia://internal/' + realm,
            payload: {
                realm: realm,
                energy: energy,
                pressure: pressure,
                turbulence: turbulence
            },
            receivedAt: now
        });
    }

    return signals;
}

export function startPolling() {
    console.log('[PrimordiaOS] Poller initialized (internal physics).');
}
