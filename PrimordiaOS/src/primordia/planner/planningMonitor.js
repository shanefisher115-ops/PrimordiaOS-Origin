import { Logger } from '../../core/logger';
export const PlanningMonitor = {
    monitor(planId) {
        Logger.info('PlanningMonitor monitoring plan', { planId });
        return { status: 'OK', planId };
    }
};
