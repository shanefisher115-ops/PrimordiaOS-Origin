// MoneyPlugHub Offer Fetcher

import axios from "axios";
import { MoneyPlugGraph } from "./graph";

export async function fetchOffers(graph: MoneyPlugGraph) {
  const offers: any[] = [];

  for (const node of graph.nodes) {
    offers.push({
      id: `${node.id}-${Date.now()}`,
      source: node.id,
      payout: Math.random() * 2.5 // simulated payout
    });
  }

  return offers;
}
