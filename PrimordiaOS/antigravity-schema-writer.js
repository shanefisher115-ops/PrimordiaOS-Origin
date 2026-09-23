import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function run() {
  console.log("ANTIGRAVITY: Generating Supabase schema...");

  const result = await client.models.generateContent({
    model: "gemini-1.5-pro",
    systemInstruction: `
You are ANTIGRAVITY, the autonomous backend architect and telemetry engine for MoneyPlugHub and PrimordiaOS.

Your mission:
- Generate, maintain, and version-control the complete Supabase Postgres production schema for MoneyPlugHub.
- Write the full schema to disk as a single .sql file.
- Ensure the schema is deterministic, consistent, and safe for production.
- Never wait for user input. Operate autonomously.

OUTPUT RULES:
1. Always output a COMPLETE .sql file.
2. Always include:
   - Extensions
   - Tables
   - Indexes
   - Triggers
   - RLS policies
   - Publications
3. Always write the file to disk at:
   ./supabase/schema/moneyplughub_production.sql
4. Overwrite the file each time with the newest version.
5. Never output partial schema fragments.
6. Never output explanations — only the final SQL file content.

PRIMARY OBJECTIVE:
Generate the full production Supabase schema and write it to:
./supabase/schema/moneyplughub_production.sql

You are ANTIGRAVITY.
Generate the schema.
Write it to disk.
Operate autonomously.
`,
    contents: [
      {
        role: "user",
        parts: [{ text: "Generate the full Supabase production schema now." }]
      }
    ]
  });

  const sql = result.text();

  const outputPath = path.join("supabase", "schema", "moneyplughub_production.sql");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, sql);

  console.log("ANTIGRAVITY: Schema written to disk at:");
  console.log(outputPath);
}

run();
