import axios from 'axios';
import { CakeConfig } from '../config/cake';
import { Logger } from '../core/logger';
export class CakeService {
    client = axios.create({
        baseURL: CakeConfig.baseUrl,
        timeout: 15000,
    });
    async fetchOffers() {
        try {
            const res = await this.client.get(CakeConfig.offerFeedEndpoint, {
                params: {
                    api_key: CakeConfig.apiKey,
                    affiliate_id: CakeConfig.affiliateId,
                    exclude_hidden: true,
                },
            });
            const offers = this.normalizeOffers(res.data);
            Logger.info('Fetched offers from CAKE', { count: offers.length });
            return offers;
        }
        catch (err) {
            Logger.error('Error fetching offers from CAKE', {
                error: err.message,
            });
            return [];
        }
    }
    normalizeOffers(raw) {
        if (!raw || !Array.isArray(raw.offers))
            return [];
        return raw.offers.map((o) => ({
            offer_id: Number(o.offer_id),
            offer_name: o.offer_name,
            vertical_name: o.vertical_name,
            epc: o.epc ? Number(o.epc) : undefined,
            payout: o.payout ? Number(o.payout) : undefined,
            currency: o.currency,
            status: o.status,
            preview_url: o.preview_url,
        }));
    }
}
export const cakeService = new CakeService();
