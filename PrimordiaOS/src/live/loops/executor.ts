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
