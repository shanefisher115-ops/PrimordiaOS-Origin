export function Optimizer(referrals = [], transactions = []) {
  const insights = [];
  for (const ref of referrals) {
    insights.push({
      agent: "Optimizer",
      type: "optimization",
      badge: "?? REWARD CHANNEL",
      program: ref.program,
      url: ref.referral_url,
      message: `Optimizer: Active affiliate portal [${ref.program}] ready for capital routing. Code: ${ref.referral_code || "AUTO"}.`
    });
  }
  return insights;
}
