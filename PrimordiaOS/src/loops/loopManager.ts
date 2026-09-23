import { Logger } from '../core/logger';
import { LoopRules } from './loopRules';
import { LoopSafety } from './loopSafety';
import { LoopLedger } from './loopLedger';
import { LoopPromoter } from './loopPromoter';

export interface LoopContext {
  offerId: number;
  network: string;
  epc: number;
  payout: number;
  vertical?: string;
}

export class LoopManager {
  async evaluateAndRun(context: LoopContext) {
    Logger.info('LoopManager evaluating loop', context);

    const allowed = LoopSafety.isSafe(context);
    if (!allowed) {
      Logger.warn('LoopManager blocked by safety', { offerId: context.offerId });
      return { success: false, reason: 'SAFETY_BLOCK' };
    }

    const rule = LoopRules.selectRule(context);
    if (!rule) {
      Logger.warn('LoopManager found no matching rule', { offerId: context.offerId });
      return { success: false, reason: 'NO_RULE' };
    }

    await LoopLedger.recordDecision(context, rule);
    await LoopPromoter.promote(context, rule);

    return { success: true, rule };
  }
}

export const loopManager = new LoopManager();
