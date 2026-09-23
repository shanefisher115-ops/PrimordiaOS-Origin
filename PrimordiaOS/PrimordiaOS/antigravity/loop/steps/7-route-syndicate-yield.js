import { eventBus } from "../../../kernel/event-bus.js";

export const DEFAULT_SYNDICATES = [
  { tag: "VRTX", name: "[VORTEX] Cyber Syndicate", sigil: "CYBER-DRAGON", weekly_score: 142500 },
  { tag: "APEX", name: "[APEX] Sovereign Capital Guild", sigil: "SOVEREIGN-EMP", weekly_score: 118200 },
  { tag: "PLSE", name: "[PULSE] TikTok Viral Growth Army", sigil: "VIRAL-PULSE", weekly_score: 95400 },
  { tag: "QNTM", name: "[QUANT] Matrix Alchemists", sigil: "QUANT-MATRIX", weekly_score: 88900 }
];

export async function step7_routeSyndicateYield(options = {}) {
  console.log("💰 [Step 7/7] Routing yield to MoneyPlugHub syndicates with +15% XP multiplier...");

  const cycleId = options.cycleId || `cycle_${options.cycle || Date.now()}`;
  const timestamp = options.timestamp || Date.now();
  const basePoolCents = options.poolCents || options.totalYieldCents || options.totalCents || 1000000;
  const xpBonusMultiplier = 1.15;
  const totalWithBonus = Math.round(basePoolCents * xpBonusMultiplier);

  const syndicates = options.syndicates || ["VRTX", "APEX", "PLSE", "QNTM"];
  const syndicateScores = DEFAULT_SYNDICATES.filter(s => syndicates.includes(s.tag));
  const totalScore = syndicateScores.reduce((acc, s) => acc + s.weekly_score, 0);

  const distributions = syndicateScores.map(s => ({
    tag: s.tag,
    name: s.name,
    yieldCents: Math.round((s.weekly_score / totalScore) * basePoolCents),
    boostedYieldCents: Math.round((s.weekly_score / totalScore) * totalWithBonus)
  }));

  const payload = {
    success: true,
    cycleId,
    timestamp,
    blockIndex: options.blockIndex ?? options.ledgerBlock?.index ?? 0,
    blockHash: options.blockHash ?? options.ledgerBlock?.hash ?? "",
    syndicates,
    syndicatesCount: syndicates.length,
    basePoolCents,
    totalYieldCents: basePoolCents,
    totalCents: basePoolCents,
    xpMultiplier: xpBonusMultiplier,
    xpBonusMultiplier,
    distributions
  };

  eventBus.emit("SYNDICATE_YIELD_ROUTED", payload);
  eventBus.emitRealmEvent("SYNDICATE_YIELD_ROUTED", payload, "economic_realm");
  return payload;
}

export const routeSyndicateYield = step7_routeSyndicateYield;
