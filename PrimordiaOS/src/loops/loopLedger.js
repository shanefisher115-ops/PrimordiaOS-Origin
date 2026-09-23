import { Logger } from '../core/logger';
const ledger = [];
export const LoopLedger = {
    async recordDecision(context, rule) {
        const record = {
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
