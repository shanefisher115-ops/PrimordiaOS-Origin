export const SwarmMath = {
    epc(payout, clicks) {
        if (clicks === 0)
            return 0;
        return payout / clicks;
    },
    weightedScore(epc, payout) {
        return epc * 0.7 + payout * 0.3;
    },
};
