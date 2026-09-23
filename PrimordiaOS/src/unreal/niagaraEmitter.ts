import { Logger } from '../core/logger';
import { unrealBridge } from '../integrations/unrealBridge';

export class NiagaraEmitter {
  async emit(effectName: string, params: Record<string, any> = {}) {
    Logger.info('NiagaraEmitter emitting effect', { effectName, params });

    return await unrealBridge.sendCommand('NIAGARA_EMIT', {
      effectName,
      params,
    });
  }
}

export const niagaraEmitter = new NiagaraEmitter();
