import { Logger } from '../core/logger';
import { simulationRouter } from './simulationRouter';
import { SimulationState } from './simulationState';

export class SimulationWorker {
  async run(command: string, payload?: any) {
    Logger.info('SimulationWorker running command', { command, payload });

    const result = await simulationRouter.route(command, payload);
    SimulationState.set('lastEvent', { command, payload, result, at: new Date().toISOString() });

    return result;
  }
}

export const simulationWorker = new SimulationWorker();
