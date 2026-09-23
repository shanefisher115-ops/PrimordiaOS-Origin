/**
 * Affiliate Conduit: Routes affiliate links, campaigns, and syndicate offers.
 */
export class AffiliateConduit {
  constructor() {
    this.campaigns = [
      { id: "maxbounty_main", name: "MaxBounty High-Yield Conduit", status: "active" },
      { id: "moneyplughub_vip", name: "MoneyPlugHub Direct Portal", status: "active" }
    ];
  }

  getActiveCampaigns() {
    return this.campaigns;
  }
}

export const affiliateConduit = new AffiliateConduit();
