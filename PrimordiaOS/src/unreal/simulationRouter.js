import { Logger } from '../core/logger';
import { unrealSceneController } from './unrealSceneController';
import { niagaraEmitter } from './niagaraEmitter';
export class SimulationRouter {
    async route(command, payload) {
        Logger.info('SimulationRouter routing command', { command, payload });
        switch (command) {
            case 'LOAD_SCENE':
                return await unrealSceneController.loadScene(payload?.scene);
            case 'UNLOAD_SCENE':
                return await unrealSceneController.unloadScene();
            case 'TRIGGER_EVENT':
                return await unrealSceneController.triggerEvent(payload?.event, payload?.data);
            case 'EMIT_EFFECT':
                return await niagaraEmitter.emit(payload?.effect, payload?.params);
            default:
                Logger.warn('SimulationRouter received unknown command', { command });
                return { success: false, error: 'Unknown simulation command' };
        }
    }
}
export const simulationRouter = new SimulationRouter();
