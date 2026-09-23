interface MPHConfig {
  enabled: boolean;
  rotationIntervalMs: number;
}

interface Offer {
  id: string;
  label: string;
  vertical: string;
  payout: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export class MoneyPlugHub {
  private config: MPHConfig;
  private offers: Offer[] = [];
  private lastRotation = 0;
  private currentOffer?: Offer;

  constructor(config: MPHConfig) {
    this.config = config;
    this.seedOffers();
  }

  private seedOffers() {
    this.offers = [
      { id: "MPH_MAXBOUNTY_001", label: "Finance Lead Gen", vertical: "finance", payout: 45, impressions: 0, clicks: 0, conversions: 0 },
      { id: "MPH_SWAGBUCKS_001", label: "Rewards Signup", vertical: "rewards", payout: 5, impressions: 0, clicks: 0, conversions: 0 },
      { id: "MPH_RAKUTEN_001", label: "Cashback Referral", vertical: "shopping", payout: 10, impressions: 0, clicks: 0, conversions: 0 }
    ];
  }

  tick() {
    if (!this.config.enabled) return;
    const now = Date.now();
    if (now - this.lastRotation > this.config.rotationIntervalMs) {
      this.rotate();
      this.lastRotation = now;
    }
  }

  private rotate() {
    this.currentOffer = this.offers[Math.floor(Math.random() * this.offers.length)];
    if (!this.currentOffer) return;
    this.currentOffer.impressions++;
    console.log("[MoneyPlugHub] Rotating to offer:", this.currentOffer.id, "-", this.currentOffer.label);
  }

  triggerBurst(reason: "ASCENSION" | "MANUAL") {
    if (!this.currentOffer) this.rotate();
    if (!this.currentOffer) return;
    console.log(`[MoneyPlugHub] Burst (${reason}) →`, this.currentOffer.id, "-", this.currentOffer.label);
    this.currentOffer.impressions++;
  }

  recordClick() {
    if (!this.currentOffer) return;
    this.currentOffer.clicks++;
  }

  recordConversion() {
    if (!this.currentOffer) return;
    this.currentOffer.conversions++;
  }

  getCurrentOffer() {
    return this.currentOffer;
  }

  getOffers() {
    return this.offers;
  }
}
