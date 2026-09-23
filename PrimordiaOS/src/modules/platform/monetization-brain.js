import { Logger } from '../../core/logger';
const ledger = [];
export const Monetization = {
    record(source, amount) {
        const entry = {
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
