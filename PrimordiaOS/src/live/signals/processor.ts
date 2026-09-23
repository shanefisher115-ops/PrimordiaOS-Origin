export function processSignals(raw) {
    return raw.map((sig) => {
        const payload = sig.payload || {};
        const realm = payload.realm || 'unknown';

        let magnitude = 0;
        if (typeof payload.energy === 'number') magnitude += payload.energy;
        if (typeof payload.pressure === 'number') magnitude += payload.pressure * 0.5;
        if (typeof payload.turbulence === 'number') magnitude += payload.turbulence * 0.3;

        return {
            id: sig.id,
            realm: realm,
            kind: 'telemetry',
            magnitude: magnitude,
            createdAt: new Date(),
            payload: payload
        };
    });
}
