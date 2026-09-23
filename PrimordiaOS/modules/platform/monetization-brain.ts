export type RevenueSource =
  | "tiktok"
  | "tiktok_live"
  | "youtube"
  | "instagram"
  | "threads"
  | "maxbounty"
  | "crypto"
  | "moneyplughub"
  | "technophysical";

export type RevenueEvent = {
  source: RevenueSource;
  amount: number;
  currency: string;
  timestamp: number;
  meta?: Record<string, unknown>;
};

export class MonetizationBrain {
  private events: RevenueEvent[] = [];

  record(event: RevenueEvent) {
    this.events.push(event);
  }

  total() {
    return this.events.reduce((sum, e) => sum + e.amount, 0);
  }

  bySource(source: RevenueSource) {
    return this.events.filter(e => e.source === source);
  }

  summary() {
    const map = new Map<RevenueSource, number>();
    for (const e of this.events) {
      map.set(e.source, (map.get(e.source) || 0) + e.amount);
    }
    return map;
  }
}

export const Monetization = new MonetizationBrain();
