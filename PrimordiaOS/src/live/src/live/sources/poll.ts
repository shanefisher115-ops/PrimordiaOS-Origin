import { fetchSupabaseSignals } from './supabase-realtime.js';
import { fetchWebSocketSignals } from './websocket-feeds.js';
import { fetchCloudflareAISignals } from './cloudflare-ai-gateway.js';
import { fetchLocalMetricSignals } from './local-metrics.js';
import { fetchGpuTelemetrySignals } from './gpu-telemetry.js';
import { fetchUnrealSimSignals } from './unreal-sim.js';
import { fetchCloudflareWorkerSignals } from './cloudflare-workers.js';
import { fetchVertexStreamsSignals } from './vertex-streams.js';

export function fetchRawSignals() {
    const synthetic = fetchSyntheticSignals();
    const supabase = fetchSupabaseSignals();
    const websockets = fetchWebSocketSignals();
    const cloudflareAI = fetchCloudflareAISignals();
    const localMetrics = fetchLocalMetricSignals();
    const gpu = fetchGpuTelemetrySignals();
    const unreal = fetchUnrealSimSignals();
    const workers = fetchCloudflareWorkerSignals();
    const vertex = fetchVertexStreamsSignals();

    return [
        ...synthetic,
        ...supabase,
        ...websockets,
        ...cloudflareAI,
        ...localMetrics,
        ...gpu,
        ...unreal,
        ...workers,
        ...vertex
    ];
}

export function fetchSyntheticSignals() {
    const now = new Date();
    const realms = ['core', 'edge', 'quantum', 'memory', 'io'];
    const signals = [];

    for (const realm of realms) {
        const energy = Math.random() * Math.random();
        const pressure = Math.sin(Date.now() / 5000) * 0.5 + 0.5;
        const turbulence = Math.random() * pressure;

        signals.push({
            id: 'synthetic-' + now.getTime() + '-' + realm,
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
    console.log('[PrimordiaOS] Poller initialized (synthetic + external modules).');
}
