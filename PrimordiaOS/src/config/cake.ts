import { Env } from './env';

export const CakeConfig = {
  baseUrl: Env.cakeDomain,
  affiliateId: Env.cakeAffiliateId,
  apiKey: Env.cakeApiKey,
  offerFeedEndpoint: `/affiliates/api/1/offers.asmx/OfferFeed`,
  subAffiliateSummaryEndpoint: `/affiliates/api/1/reports.asmx/SubAffiliateSummary`,
};
