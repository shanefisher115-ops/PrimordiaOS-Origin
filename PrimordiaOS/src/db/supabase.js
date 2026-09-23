import { cakeAgent } from '../agents/affiliate/cakeAgent';
import { maxbountyAgent } from '../agents/affiliate/maxbountyAgent';
import { Logger } from '../core/logger';
export async function runOfferSyncWorker() {
    Logger.info('OfferSyncWorker started');
    await cakeAgent.syncOffers();
    await maxbountyAgent.syncOffers();
    Logger.info('OfferSyncWorker completed');
}
