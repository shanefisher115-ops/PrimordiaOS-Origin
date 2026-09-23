export function Categorizer(transaction = {}, categories = [], rules = []) {
  const insights = [];
  if (!transaction || !transaction.description) return insights;
  const desc = transaction.description.toLowerCase();

  for (const rule of rules) {
    if (rule.pattern && desc.includes(rule.pattern.toLowerCase())) {
      const category = categories.find(c => c.id === rule.category_id);
      insights.push({
        agent: "Categorizer",
        type: "categorization",
        badge: "??? RULE MATCH",
        category_id: rule.category_id,
        category_name: category ? category.name : "Classified",
        message: `Categorizer: Bound "${transaction.description}" to [${category ? category.name : "Category"}] via rule pattern "${rule.pattern}".`
      });
    }
  }

  if (!insights.length) {
    if (desc.includes("coffee") || desc.includes("starbucks") || desc.includes("diner")) {
      insights.push({ agent: "Categorizer", type: "categorization", badge: "? HEURISTIC", message: `Categorizer: Suggested category [Dining & Food] for "${transaction.description}".` });
    } else if (desc.includes("uber") || desc.includes("lyft") || desc.includes("gas")) {
      insights.push({ agent: "Categorizer", type: "categorization", badge: "?? HEURISTIC", message: `Categorizer: Suggested category [Transportation] for "${transaction.description}".` });
    }
  }

  return insights;
}
