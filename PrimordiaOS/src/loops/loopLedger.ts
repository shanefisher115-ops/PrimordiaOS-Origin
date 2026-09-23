import { Logger } from '../core/logger';
import { LoopContext } from './loopManager';
import { LoopRule } from './loopRules';

interface LoopRecord {
  id: string;
  offerId: number;
  network: string;
  ruleId: string;
  action: string;
  epc: number;
  payout: number;
  timestamp: string;
}

const ledger: LoopRecord[] = [];

export const LoopLedger = {
  async recordDecision(context: LoopContext, rule: LoopRule) {
    const record: LoopRecord = {
      id: `loop_${Date.now()}`,
      offerId: context.offerId,
      network: context.network,
      ruleId: rule.id,
      action: rule.action,
      epc: context.epc,
      payout: context.payout,
      timestamp: new Date().toISOString(),
    };

    ledger.push(record);
    Logger.info('LoopLedger recorded decision', { id: record.id, ruleId: rule.id });
  },

  all() {
    return ledger;
  },
};
