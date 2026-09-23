import { Logger } from '../../core/logger';
export const PlanningExecutor = {
    async execute(strategy) {
        Logger.info('PlanningExecutor executing strategy', strategy);
        return { executed: true };
    }
};
