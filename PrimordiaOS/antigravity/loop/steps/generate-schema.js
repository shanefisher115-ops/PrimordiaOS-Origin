import fs from "fs";
import path from "path";

export async function generateSchema() {
  console.log("?? Step 1: Synthesizing canonical schema...");
  const schemaPath = path.resolve("primordiaos", "moneyplughub", "schema", "moneyplughub_production.sql");
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Canonical schema file not found at: ${schemaPath}`);
  }
  return schemaPath;
}
