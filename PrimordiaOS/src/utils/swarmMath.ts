export const SwarmMath = {
  epc(payout: number, clicks: number): number {
    if (clicks === 0) return 0;
    return payout / clicks;
  },

  weightedScore(epc: number, payout: number): number {
    return epc * 0.7 + payout * 0.3;
  },
};
