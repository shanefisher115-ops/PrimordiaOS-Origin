import { Logger } from '../../core/logger';

export const SystemHealth = {
  check() {
    return {
      timestamp: new Date().toISOString(),
      status: 'OK',
      load: Math.random(),
    };
  }
};
