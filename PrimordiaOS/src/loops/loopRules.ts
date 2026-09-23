import { Logger } from '../core/logger';
import { LoopContext } from './loopManager';

export interface LoopRule {
  id: string;
  name: string;
  minEpc: number;
  minPayout: number;
  vertical?: string;
  action: 'BOOST' | 'PAUSE' | 'TEST';
}

const rules: LoopRule[] = [
  { id: 'boost_high_epc', name: 'Boost High EPC', minEpc: 0.5, minPayout: 20, action: 'BOOST' },
  { id: 'test_mid_epc', name: 'Test Mid EPC', minEpc: 0.2, minPayout: 10, action: 'TEST' },
  { id: 'pause_low_epc', name: 'Pause Low EPC', minEpc: 0.0, minPayout: 0, action: 'PAUSE' },
];

export const LoopRules = {
  selectRule(context: LoopContext): LoopRule | null {
    Logger.info('LoopRules selecting rule', context);

    const sorted = [...rules].sort((a, b) => b.minEpc - a.minEpc);
    for (const rule of sorted) {
      if (context.epc >= rule.minEpc && context.payout >= rule.minPayout) {
        if (rule.vertical && rule.vertical !== context.vertical) continue;
        Logger.info('LoopRules matched rule', { ruleId: rule.id });
        return rule;
      }
    }
    return null;
  },

  list() {
    return rules;
  },
};
