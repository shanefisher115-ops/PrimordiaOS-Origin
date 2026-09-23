import { Logger } from '../core/logger';
import { unrealBridge } from '../integrations/unrealBridge';
import { SimulationState } from './simulationState';

export class UnrealSceneController {
  async loadScene(sceneName: string) {
    Logger.info('UnrealSceneController loading scene', { sceneName });

    const result = await unrealBridge.sendCommand('LOAD_SCENE', { sceneName });
    SimulationState.set('currentScene', sceneName);

    return { success: true, result };
  }

  async unloadScene() {
    Logger.info('UnrealSceneController unloading scene');

    const result = await unrealBridge.sendCommand('UNLOAD_SCENE');
    SimulationState.set('currentScene', null);

    return { success: true, result };
  }

  async triggerEvent(eventName: string, payload?: any) {
    Logger.info('UnrealSceneController triggering event', { eventName, payload });

    return await unrealBridge.sendCommand('TRIGGER_EVENT', { eventName, payload });
  }
}

export const unrealSceneController = new UnrealSceneController();
