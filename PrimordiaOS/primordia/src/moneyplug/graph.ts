// MoneyPlugHub Graph Definition

export interface MoneyPlugNode {
  id: string;
  type: "traffic" | "conversion" | "payout";
  weight: number;
}

export interface MoneyPlugGraph {
  nodes: MoneyPlugNode[];
}

export function buildMoneyPlugGraph(): MoneyPlugGraph {
  return {
    nodes: [
      { id: "rakuten", type: "traffic", weight: 1.0 },
      { id: "swagbucks", type: "traffic", weight: 0.8 },
      { id: "ibotta", type: "conversion", weight: 1.2 },
      { id: "acorns", type: "payout", weight: 0.5 },
      { id: "maxbounty", type: "conversion", weight: 1.5 },
      { id: "partnerstack", type: "payout", weight: 0.7 }
    ]
  };
}
