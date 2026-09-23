export function schemaVoice(diff = "") {
  const normalized = diff.toLowerCase();
  const lines = [];
  if (normalized.includes("create table")) {
    lines.push("A new structure rises within the MoneyPlugHub schema.");
  }
  if (normalized.includes("add column") || (normalized.includes("alter table") && !normalized.includes("drop"))) {
    lines.push("Existing foundations shift. The schema adapts and expands.");
  }
  if (normalized.includes("drop table") || normalized.includes("drop column")) {
    lines.push("A legacy fades. Structure dissolves into spatial history.");
  }
  if (normalized.includes("row level security") || normalized.includes("create policy")) {
    lines.push("Sanctuary wards strengthen. Row Level Security enforces perimeter defense.");
  }
  if (normalized.includes("transaction_rules")) {
    lines.push("Intelligence awakens. The transaction rules matrix is recalibrated.");
  }
  return lines;
}
