import { Logger } from '../../core/logger';

export const PlanningMonitor = {
  monitor(planId: string) {
    Logger.info('PlanningMonitor monitoring plan', { planId });
    return { status: 'OK', planId };
  }
};
