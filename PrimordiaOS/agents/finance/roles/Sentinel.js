export function Sentinel(transaction = {}, recentTransactions = []) {
  const insights = [];
  if (!transaction) return insights;
  const amount = Math.abs(transaction.amount || 0);
  const desc = (transaction.description || "").toLowerCase();

  if (amount >= 5000) {
    insights.push({ agent: "Sentinel", type: "anomaly", severity: "high", badge: "?? HIGH CAPITAL VELOCITY", message: `Sentinel: Large capital displacement of $${amount.toLocaleString()} on "${transaction.description}".` });
  } else if (amount >= 1000) {
    insights.push({ agent: "Sentinel", type: "anomaly", severity: "medium", badge: "?? NOTABLE OUTFLOW", message: `Sentinel: Outflow of $${amount.toLocaleString()} on "${transaction.description}".` });
  }

  if (desc.includes("wire") || desc.includes("cash advance") || desc.includes("crypto")) {
    insights.push({ agent: "Sentinel", type: "security", severity: "medium", badge: "?? SENSITIVE OPERATION", message: `Sentinel: Monitored financial operation: "${transaction.description}".` });
  }

  return insights;
}
