// MoneyPlugHub Node Execution Logic

import { MoneyPlugNode } from "./graph";

export async function runAffiliateNode(
  node: MoneyPlugNode,
  offers: any[]
): Promise<number> {
  const relevant = offers.filter(o => o.source === node.id);

  let revenue = 0;
  for (const offer of relevant) {
    revenue += offer.payout * node.weight;
  }

  return revenue;
}
