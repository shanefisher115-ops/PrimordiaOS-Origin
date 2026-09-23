import { CakeConfig } from '../config/cake';
import { Logger } from '../core/logger';

export interface LinkParams {
  offerId: number;
  subId1?: string;
  subId2?: string;
  agentId?: string;
  swarmId?: string;
  funnelId?: string;
}

export const LinkBuilder = {
  buildTrackingLink(params: LinkParams): string {
    const base = `${CakeConfig.baseUrl}/affiliates/${CakeConfig.affiliateId}/?`;
    const query = new URLSearchParams();

    query.set('offer_id', String(params.offerId));

    if (params.subId1) query.set('s1', params.subId1);
    if (params.subId2) query.set('s2', params.subId2);
    if (params.agentId) query.set('a', params.agentId);
    if (params.swarmId) query.set('swarm', params.swarmId);
    if (params.funnelId) query.set('funnel', params.funnelId);

    const url = base + query.toString();
    Logger.debug('Generated tracking link', { url, params });
    return url;
  },
};
