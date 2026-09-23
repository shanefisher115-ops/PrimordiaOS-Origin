import { Logger } from '../core/logger';
import { LoopLedger } from './loopLedger';
export const LoopAnalytics = {
    summary() {
        const records = LoopLedger.all();
        const total = records.length;
        const boosts = records.filter(r => r.action === 'BOOST').length;
        const pauses = records.filter(r => r.action === 'PAUSE').length;
        const tests = records.filter(r => r.action === 'TEST').length;
        const avgEpc = records.length > 0
            ? records.reduce((sum, r) => sum + r.epc, 0) / records.length
            : 0;
        const avgPayout = records.length > 0
            ? records.reduce((sum, r) => sum + r.payout, 0) / records.length
            : 0;
        const summary = {
            total,
            boosts,
            pauses,
            tests,
            avgEpc,
            avgPayout,
        };
        Logger.info('LoopAnalytics summary generated', summary);
        return summary;
    },
};
