import { Logger } from '../core/logger';
const state = {
    currentScene: null,
    lastEvent: null,
    variables: {},
};
export const SimulationState = {
    set(key, value) {
        state[key] = value;
        Logger.debug('SimulationState set', { key, value });
    },
    get(key) {
        return state[key] ?? null;
    },
    setVar(name, value) {
        state.variables[name] = value;
        Logger.debug('SimulationState variable set', { name, value });
    },
    getVar(name) {
        return state.variables[name] ?? null;
    },
    dump() {
        return state;
    },
};
