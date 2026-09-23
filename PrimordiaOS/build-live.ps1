# ================================
# PrimordiaOS Live Pipeline Builder + Auto-Run
# ================================

Write-Host ">>> Building PrimordiaOS Live Pipeline (SELF-CONTAINED)..."

# Create folder structure
$paths = @(
    "src/live",
    "src/live/sources",
    "src/live/signals",
    "src/live/loops",
    "src/live/state",
    "src/live/ledger",
    "src/live/realms",
    "src/live/boot"
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
# scheduler.ts
# ================================
@"
import './sources/poll.js';
import { runExecutor } from './loops/executor.js';

const EXECUTION_INTERVAL_SECONDS = 5;

function startScheduler() {
    console.log('[PrimordiaOS] Scheduler started.');

    setInterval(() => {
        console.log('\\n[PrimordiaOS] Scheduler tick — running executor...');
        runExecutor();
    }, EXECUTION_INTERVAL_SECONDS * 1000);
}

startScheduler();
"@ | Set-Content "src/live/scheduler.ts"


# ================================
# sources/poll.ts  (internal physics-based signals)
# ================================
@"
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
"@ | Set-Content "src/live/sources/poll.ts"


# ================================
# signals/processor.ts
# ================================
@"
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
"@ | Set-Content "src/live/signals/processor.ts"


# ================================
# state/worldstate.ts
# ================================
@"
const realmStateMap = new Map();

export function applySignalsToWorldstate(signals) {
    for (const sig of signals) {
        const payload = sig.payload || {};

        const existing = realmStateMap.get(sig.realm) || {
            realm: sig.realm,
            lastUpdated: null,
            load: 0,
            entropy: 0,
            pressure: 0
        };

        const updated = {
            realm: existing.realm,
            lastUpdated: new Date(),
            load: existing.load * 0.6 + (payload.energy || 0) * 0.4,
            entropy: existing.entropy * 0.9 + (payload.turbulence || 0) * 0.1,
            pressure: existing.pressure * 0.7 + (payload.pressure || 0) * 0.3
        };

        realmStateMap.set(sig.realm, updated);
    }
}

export function getWorldstateSnapshot() {
    return Array.from(realmStateMap.values());
}
"@ | Set-Content "src/live/state/worldstate.ts"


# ================================
# ledger/osmium-ledger.ts
# ================================
@"
const ledger = [];

export function recordSignals(signals) {
    for (const sig of signals) {
        ledger.push({
            id: sig.id,
            realm: sig.realm,
            magnitude: sig.magnitude,
            timestamp: sig.createdAt
        });
    }
}

export function getRecentLedger(limit = 20) {
    return ledger.slice(-limit);
}
"@ | Set-Content "src/live/ledger/osmium-ledger.ts"


# ================================
# realms/realm-router.ts
# ================================
@"
import { getWorldstateSnapshot } from '../state/worldstate.js';

export function routeSignals(signals) {
    const world = getWorldstateSnapshot();
    const actions = [];

    for (const sig of signals) {
        const state = world.find(r => r.realm === sig.realm);
        if (!state) continue;

        let action = 'stabilize';

        if (state.entropy > 0.7) action = 'dampen';
        else if (state.pressure > 0.8) action = 'isolate';
        else if (state.load > 0.6) action = 'redistribute';
        else if (state.load < 0.3) action = 'amplify';

        actions.push({
            realm: sig.realm,
            action: action,
            reason: 'load=' + state.load.toFixed(2) +
                    ', entropy=' + state.entropy.toFixed(2) +
                    ', pressure=' + state.pressure.toFixed(2)
        });
    }

    return actions;
}
"@ | Set-Content "src/live/realms/realm-router.ts"


# ================================
# loops/executor.ts
# ================================
@"
import { fetchRawSignals } from '../sources/poll.js';
import { processSignals } from '../signals/processor.js';
import { applySignalsToWorldstate, getWorldstateSnapshot } from '../state/worldstate.js';
import { recordSignals, getRecentLedger } from '../ledger/osmium-ledger.js';
import { routeSignals } from '../realms/realm-router.js';

export function runExecutor() {
    console.log('[PrimordiaOS] Executor running...');

    const raw = fetchRawSignals();
    const normalized = processSignals(raw);

    applySignalsToWorldstate(normalized);
    recordSignals(normalized);

    const actions = routeSignals(normalized);
    const world = getWorldstateSnapshot();
    const ledger = getRecentLedger(10);

    console.log('=== REALM SNAPSHOT ===');
    for (const state of world) {
        console.log('  [' + state.realm + '] load=' + state.load.toFixed(3) +
                    ' entropy=' + state.entropy.toFixed(3) +
                    ' pressure=' + state.pressure.toFixed(3));
    }

    console.log('=== ACTIONS ===');
    for (const act of actions) {
        console.log('  [' + act.realm + '] -> ' + act.action.toUpperCase() +
                    ' (' + act.reason + ')');
    }

    console.log('=== LEDGER (recent) ===');
    for (const entry of ledger) {
        console.log('  [' + entry.realm + '] id=' + entry.id +
                    ' mag=' + entry.magnitude.toFixed(3) +
                    ' @ ' + entry.timestamp.toISOString());
    }
}
"@ | Set-Content "src/live/loops/executor.ts"


# ================================
# boot/boot.ts
# ================================
@"
import '../scheduler.js';

console.log('[PrimordiaOS] Boot sequence complete — scheduler online.');
"@ | Set-Content "src/live/boot/boot.ts"


Write-Host ">>> PrimordiaOS Live Pipeline build complete."
Write-Host ">>> Launching PrimordiaOS Live..."

# AUTO-RUN
npx tsx src/live/scheduler.ts
