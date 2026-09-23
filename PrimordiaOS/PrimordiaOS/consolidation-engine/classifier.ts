import path from "path";
import fs from "fs";

// Load ontology directly or fallback to safe read
let ontology: any;
try {
  const ontologyPath = path.resolve(process.cwd(), "primordiaos", "config", "ontology.json");
  ontology = JSON.parse(fs.readFileSync(ontologyPath, "utf-8"));
} catch {
  ontology = { categories: {}, realms: {} };
}

export function classifyItem(filePath: string) {
  const ext = path.extname(filePath);
  const name = path.basename(filePath);
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/");

  const categories = ontology.categories || {};
  const realms = ontology.realms || {};

  const category = Object.keys(categories).find(cat =>
    categories[cat].patterns?.some((p: string) =>
      normalizedPath.includes(p.toLowerCase())
    )
  ) || "unknown";

  const realm = Object.keys(realms).find(r =>
    realms[r].patterns?.some((p: string) =>
      normalizedPath.includes(p.toLowerCase())
    )
  ) || "local_realm";

  return {
    name,
    filePath,
    ext,
    category,
    realm,
    status: category === "deprecated" ? "deprecated" : "active"
  };
}
