import { Logger } from '../core/logger';
import { LoopContext } from './loopManager';
import { LoopRule } from './loopRules';
import { moneyPlugHubBridge } from '../integrations/moneyPlugHubBridge';

export const LoopPromoter = {
  async promote(context: LoopContext, rule: LoopRule) {
    Logger.info('LoopPromoter promoting decision', { context, rule });

    await moneyPlugHubBridge.syncConversion({
      offerId: context.offerId,
      network: context.network,
      epc: context.epc,
      payout: context.payout,
      ruleId: rule.id,
      action: rule.action,
    });
  },
};
