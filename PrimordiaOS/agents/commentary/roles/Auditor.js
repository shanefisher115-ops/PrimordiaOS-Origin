export function Auditor(diff = "") {
  const normalized = diff.toLowerCase();
  const commentary = [];
  if (normalized.includes("drop table")) {
    commentary.push({ role: "Auditor", type: "danger", badge: "?? DESTRUCTIVE DDL", message: "Auditor: Table deletion detected. Verify no dependent agents rely on it." });
  }
  if (normalized.includes("alter table") && normalized.includes("drop column")) {
    commentary.push({ role: "Auditor", type: "warning", badge: "?? FIELD REMOVAL", message: "Auditor: Column removal detected. Check for ledger or agent dependencies." });
  }
  if (normalized.includes("row level security") || normalized.includes("create policy")) {
    commentary.push({ role: "Auditor", type: "security", badge: "?? SECURITY CHECK", message: "Auditor: Row Level Security modifications detected. Verify tenant isolation." });
  }
  return commentary;
}
