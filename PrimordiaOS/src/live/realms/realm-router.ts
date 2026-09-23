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
