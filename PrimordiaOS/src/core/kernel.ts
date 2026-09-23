import { Logger } from './logger';
import { State } from './state';

export class Kernel {
  boot() {
    Logger.info('PrimordiaOS Kernel booting...');
    State.set('kernel.status', 'BOOTED');
    State.set('kernel.bootTime', new Date().toISOString());
  }

  shutdown() {
    Logger.warn('PrimordiaOS Kernel shutting down...');
    State.set('kernel.status', 'SHUTDOWN');
  }

  status() {
    return {
      status: State.get('kernel.status'),
      bootTime: State.get('kernel.bootTime'),
    };
  }
}

export const kernel = new Kernel();
