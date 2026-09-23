// primordiaos-core/workflows/engine.js

import fetch from "node-fetch";
import { loadSkill } from "../skill-loader.js";

// Cloud Run endpoint
const CLOUD_ENDPOINT =
  "https://primordia-api-560206548182.us-central1.run.app/api/browser/context";

// Main workflow runner
export async function runWorkflow(context = {}) {
  console.log("🔁 PrimordiaOS Workflow Engine");
  console.log("Sending context:", context);

  try {
    const res = await fetch(CLOUD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context)
    });

    const data = await res.json();

    console.log("📡 Cloud Run response:", data);

    if (data.nextAction) {
      console.log("⚡ Executing nextAction:", data.nextAction);
      await loadSkill(data.nextAction);
    } else {
      console.log("⚠️ No nextAction returned from Cloud Run.");
    }
  } catch (err) {
    console.error("❌ Workflow engine error:", err);
  }
}
