import { Logger } from '../../core/logger';
import { RealmCoordinator } from './realmCoordinator';
import { TaskPlanner } from './taskPlanner';
export const GlobalOrchestrator = {
    async tick() {
        Logger.info('GlobalOrchestrator tick');
        await RealmCoordinator.syncRealms();
        await TaskPlanner.planGlobalTasks();
    }
};
