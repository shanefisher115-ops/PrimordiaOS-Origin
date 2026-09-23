# ================================
# PrimordiaOS Extended Live Sources + Auto-Run
# ================================

Write-Host ">>> Extending PrimordiaOS Live Pipeline with 8 source modules..."

$paths = @(
    "src/live",
    "src/live/sources"
)

foreach ($p in $paths) {
    if (!(Test-Path $p)) {
        New-Item -ItemType Directory -Path $p | Out-Null
        Write-Host "Created: $p"
    } else {
        Write-Host "Exists:  $p"
    }
}

# ================================
# UPDATED sources/poll.ts
# ================================
@"
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
"@ | Set-Content "src/live/sources/poll.ts"

# ================================
# supabase-realtime.ts (stub)
# ================================
@"
export function fetchSupabaseSignals() {
    const now = new Date();
    return [
        {
            id: 'supabase-' + now.getTime(),
            source: 'supabase://realtime',
            payload: {
                realm: 'data',
                event: 'stub',
                table: 'example',
                op: 'insert'
            },
            receivedAt: now
        }
    ];
}
"@ | Set-Content "src/live/sources/supabase-realtime.ts"

# ================================
# websocket-feeds.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/websocket-feeds.ts"

# ================================
# cloudflare-ai-gateway.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/cloudflare-ai-gateway.ts"

# ================================
# local-metrics.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/local-metrics.ts"

# ================================
# gpu-telemetry.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/gpu-telemetry.ts"

# ================================
# unreal-sim.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/unreal-sim.ts"

# ================================
# cloudflare-workers.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/cloudflare-workers.ts"

# ================================
# vertex-streams.ts (stub)
# ================================
@"
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
"@ | Set-Content "src/live/sources/vertex-streams.ts"

Write-Host ">>> All 8 source modules added."
Write-Host ">>> Launching PrimordiaOS Live with extended sources..."

npx tsx src/live/scheduler.ts
