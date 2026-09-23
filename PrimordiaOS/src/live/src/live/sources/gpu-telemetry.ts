export function fetchGpuTelemetrySignals() {
    const now = new Date();
    return [
        {
            id: 'gpu-' + now.getTime(),
            source: 'local://gpu',
            payload: {
                realm: 'gpu',
                vram: Math.random(),
                load: Math.random()
            },
            receivedAt: now
        }
    ];
}
