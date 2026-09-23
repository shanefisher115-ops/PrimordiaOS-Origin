import { Logger } from '../../core/logger';
import { swarmWorker } from '../../workers/swarmWorker';
export class SwarmScheduler {
    async schedule(task, event) {
        Logger.info('SwarmScheduler scheduling task', { task, eventId: event.eventId });
        setTimeout(async () => {
            await swarmWorker.execute(task, event);
        }, 10);
    }
}
export const swarmScheduler = new SwarmScheduler();
