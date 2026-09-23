import { Logger } from '../../core/logger';
export class OfferRouter {
    route(offers) {
        const combined = [];
        for (const o of offers.cake) {
            combined.push({
                network: 'cake',
                offerId: o.offer_id,
                name: o.offer_name,
                epc: o.epc,
                payout: o.payout,
                preview_url: o.preview_url,
            });
        }
        for (const o of offers.maxbounty) {
            combined.push({
                network: 'maxbounty',
                offerId: o.id,
                name: o.name,
                epc: o.epc,
                payout: o.payout,
                preview_url: o.preview_url,
            });
        }
        combined.sort((a, b) => (b.epc || 0) - (a.epc || 0));
        Logger.info('OfferRouter sorted offers by EPC', {
            top: combined.slice(0, 5),
        });
        return combined;
    }
}
export const offerRouter = new OfferRouter();
