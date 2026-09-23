import axios from "axios";
import { AffiliateAdapter, AffiliateEarning } from "./base-adapter";

export class RakutenAdapter extends AffiliateAdapter {
  id = "rakuten";
  label = "Rakuten";

  async fetch(): Promise<AffiliateEarning | null> {
    try {
      // Replace with YOUR endpoint + YOUR API key
      const res = await axios.get("YOUR_RAKUTEN_API_ENDPOINT", {
        headers: { Authorization: `BGHskL9v5j38kxwkvgUAfR34uXy7styFJ	` }
      });

      const amount = Number(res.data?.earnings ?? 0);

      return {
        id: this.id,
        label: this.label,
        amount,
        currency: "USD",
        timestamp: Date.now()
      };
    } catch {
      return null;
    }
  }
}
