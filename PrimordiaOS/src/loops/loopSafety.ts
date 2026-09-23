import { Logger } from '../core/logger';
import { LoopContext } from './loopManager';

export const LoopSafety = {
  isSafe(context: LoopContext): boolean {
    if (context.payout > 1000) {
      Logger.warn('LoopSafety: payout too high, blocking', { payout: context.payout });
      return false;
    }

    if (context.vertical && context.vertical.toLowerCase().includes('adult')) {
      Logger.warn('LoopSafety: blocked vertical', { vertical: context.vertical });
      return false;
    }

    return true;
  },
};
