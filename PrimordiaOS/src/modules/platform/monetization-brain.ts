import { Logger } from '../../core/logger';

interface RevenueRecord {
  id: string;
  source: string;
  amount: number;
  timestamp: string;
}

const ledger: RevenueRecord[] = [];

export const Monetization = {
  record(source: string, amount: number) {
    const entry: RevenueRecord = {
      id: `rev_${Date.now()}`,
      source,
      amount,
      timestamp: new Date().toISOString(),
    };

    ledger.push(entry);
    Logger.info('MonetizationBrain recorded revenue', entry);
  },

  all() {
    return ledger;
  },
};
