import axios from 'axios';
import { Logger } from '../../core/logger';
import { EventBus } from '../../core/eventBus';
export class MaxBountyAgent {
    client = axios.create({
        baseURL: 'https://api.maxbounty.com/v1',
        timeout: 15000,
    });
    async fetchOffers() {
        try {
            const res = await this.client.get('/offers', {
                headers: {
                    Authorization: `Bearer ${process.env.MAXBOUNTY_API_KEY}`,
                },
            });
            const offers = this.normalize(res.data);
            Logger.info('Fetched MaxBounty offers', { count: offers.length });
            return offers;
        }
        catch (err) {
            Logger.error('MaxBounty fetch error', { error: err.message });
            return [];
        }
    }
    normalize(raw) {
        if (!raw || !Array.isArray(raw.offers))
            return [];
        return raw.offers.map((o) => ({
            id: Number(o.id),
            name: o.name,
            epc: o.epc ? Number(o.epc) : undefined,
            payout: o.payout ? Number(o.payout) : undefined,
            preview_url: o.preview_url,
        }));
    }
    async syncOffers() {
        const offers = await this.fetchOffers();
        const event = {
            eventId: `maxbounty_sync_${Date.now()}`,
            eventType: 'OFFER_SYNC',
            source: 'maxbounty',
            data: offers,
            timestamp: new Date().toISOString(),
        };
        await EventBus.publish(event);
    }
}
export const maxbountyAgent = new MaxBountyAgent();
