// primordiaos-core/simulation/bridge.js

import fetch from "node-fetch";

// Unreal Cloud Bridge endpoint (your Unreal plugin will POST here)
const UNREAL_ENDPOINT =
  "http://localhost:8081/primordia/unreal/update"; // adjust if needed

// Update Unreal simulation state
export async function updateSimulation(metadata = {}) {
  console.log("🌍 Updating Unreal simulation…");
  console.log("Metadata:", metadata);

  try {
    const res = await fetch(UNREAL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata)
    });

    const data = await res.json();
    console.log("✔ Unreal simulation updated:", data);
    return data;
  } catch (err) {
    console.error("❌ Unreal simulation update failed:", err);
  }
}
