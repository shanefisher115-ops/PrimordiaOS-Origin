import { Logger } from '../../core/logger';
import { CakeOffer } from '../../services/cakeService';
import { MaxBountyOffer } from './maxbountyAgent';

export interface RoutedOffer {
  network: 'cake' | 'maxbounty';
  offerId: number;
  name: string;
  epc?: number;
  payout?: number;
  preview_url?: string;
}

export class OfferRouter {
  route(offers: { cake: CakeOffer[]; maxbounty: MaxBountyOffer[] }): RoutedOffer[] {
    const combined: RoutedOffer[] = [];

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
