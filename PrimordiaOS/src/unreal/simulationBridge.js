import { Logger } from '../core/logger';
import { simulationWorker } from './simulationWorker';
import { SimulationState } from './simulationState';
import { SimulationMemory } from './simulationMemory';
export class SimulationBridge {
    async execute(command, payload) {
        Logger.info('SimulationBridge executing', { command, payload });
        const result = await simulationWorker.run(command, payload);
        const currentScene = SimulationState.get('currentScene');
        const variables = SimulationState.get('variables') || {};
        SimulationMemory.snapshot(currentScene || null, variables);
        return result;
    }
    state() {
        return SimulationState.dump();
    }
    history() {
        return SimulationMemory.all();
    }
}
export const simulationBridge = new SimulationBridge();
