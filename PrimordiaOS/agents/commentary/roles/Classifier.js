export function Classifier(diff = "") {
  const normalized = diff.toLowerCase();
  const commentary = [];
  if (normalized.includes("create table")) {
    commentary.push({ role: "Classifier", type: "info", badge: "?? ENTITY EXPANSION", message: "Classifier: New core table added to MoneyPlugHub schema ontology." });
  }
  if (normalized.includes("add column")) {
    commentary.push({ role: "Classifier", type: "info", badge: "?? ATTRIBUTE AUGMENTATION", message: "Classifier: Schema expanded to support enriched attribute sets." });
  }
  if (normalized.includes("alter table") && !normalized.includes("drop")) {
    commentary.push({ role: "Classifier", type: "info", badge: "?? SCHEMA REFACTOR", message: "Classifier: Table modification detected." });
  }
  return commentary;
}
