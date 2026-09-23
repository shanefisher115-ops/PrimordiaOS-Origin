// Base Adapter — shared logic for all affiliate API adapters.
// Safe, abstract, and controlled by YOU.

export interface AffiliateEarning {
  id: string;
  label: string;
  amount: number;
  currency: string;
  timestamp: number;
}

export abstract class AffiliateAdapter {
  abstract id: string;
  abstract label: string;

  // You implement this with your own API keys + endpoints.
  abstract fetch(): Promise<AffiliateEarning | null>;
}
