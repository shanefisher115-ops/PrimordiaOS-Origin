import { Logger } from '../core/logger';
import { EventDispatch } from '../services/eventDispatch';
export class UnrealEventStream {
    async ingest(event) {
        Logger.info('UnrealEventStream ingesting event', event);
        await EventDispatch.dispatch({
            eventId: `unreal_${Date.now()}`,
            eventType: 'UNREAL_EVENT',
            source: 'unreal',
            data: event,
            timestamp: new Date().toISOString(),
        });
    }
}
export const unrealEventStream = new UnrealEventStream();
