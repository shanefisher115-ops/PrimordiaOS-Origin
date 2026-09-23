export function Forecaster(transactions = [], goals = []) {
  const insights = [];
  if (!transactions.length) return insights;

  const outflows = transactions.filter(t => (t.amount || 0) < 0).map(t => Math.abs(t.amount));
  const totalOutflow = outflows.reduce((acc, curr) => acc + curr, 0);
  const avgOutflow = outflows.length > 0 ? totalOutflow / outflows.length : 0;
  const projectedMonthly = avgOutflow * 30;

  insights.push({
    agent: "Forecaster",
    type: "forecast",
    badge: "?? LIQUIDITY RUNWAY",
    message: `Forecaster: 30-day projected expenditure estimated at $${projectedMonthly.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`
  });

  for (const goal of goals) {
    const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
    if (remaining > 0 && avgOutflow > 0) {
      const estimatedDays = Math.ceil(remaining / (avgOutflow * 0.25));
      insights.push({
        agent: "Forecaster",
        type: "forecast",
        badge: "?? GOAL TRAJECTORY",
        message: `Forecaster: Goal "${goal.name}" projected completion in ~${estimatedDays} days.`
      });
    }
  }

  return insights;
}
