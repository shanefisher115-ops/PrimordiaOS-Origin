/**
 * Classifies a discovered file/module against the Primordia Ontology.
 * @param {{relativePath: string, absolutePath: string, ext: string, isDirectory: boolean}} item
 * @returns {{name: string, category: string, realm: string, sovereignty_tier: number, status: string, version: string, dependencies: string[], file_path: string}}
 */
export function classifyModule(item) {
  const rel = item.relativePath.toLowerCase();
  const name = rel.split("/").pop().replace(/\.[^/.]+$/, "");

  let realm = "local_realm";
  let category = "kernel_core";
  let sovereignty_tier = 3;
  let status = "active";
  let dependencies = [];

  // 1. Check Realm & Category based on path signatures
  if (rel.includes("cloudflare") || rel.includes("worker") || rel.includes("cloudrun") || rel.includes("fly.toml") || rel.includes("wrangler")) {
    realm = "cloud_realm";
    category = rel.includes("worker") ? "pipeline_edge" : "realm_adapter";
    dependencies = ["@cloudflare/workers-types", "wrangler"];
  } else if (rel.includes("unreal") || rel.includes("niagara") || rel.includes("physics") || rel.includes("simulation") || rel.includes("pixelstream") || rel.includes("worldbuilder")) {
    realm = "simulation_realm";
    category = rel.includes("pipeline") ? "pipeline_simulation" : "simulation_engine";
    dependencies = ["ws", "niagara-vfx", "unreal-engine"];
  } else if (rel.includes("moneyplug") || rel.includes("affiliate") || rel.includes("posting") || rel.includes("tiktok") || rel.includes("autopost") || rel.includes("economy")) {
    realm = "economic_realm";
    category = rel.includes("loop") ? "economic_loop" : "pipeline_monetization";
    dependencies = ["express", "dotenv", "playwright"];
  } else if (rel.includes("ledger") || rel.includes("osmium") || rel.includes("identity") || rel.includes("signature")) {
    realm = "identity_realm";
    category = "identity_ledger";
    dependencies = ["crypto", "hash-chain"];
  } else if (rel.includes("agent") || rel.includes("antigrav") || rel.includes("guardian")) {
    realm = "local_realm";
    category = (rel.includes("guardian") || rel.includes("antigrav")) ? "agent_guardian" : "agent_domain";
    sovereignty_tier = (rel.includes("guardian") || rel.includes("antigrav")) ? 2 : 3;
    dependencies = ["@primordia/kernel"];
  } else if (rel.includes("hud") || rel.includes("dashboard") || rel.includes("preview") || rel.includes("index.html") || rel.includes("frontend")) {
    realm = "local_realm";
    category = "interface_hud";
    dependencies = ["vite", "react", "tailwindcss"];
  } else if (rel.includes("kernel") || rel.includes("spine") || rel.includes("bus") || rel.includes("state")) {
    realm = "local_realm";
    category = "kernel_core";
    sovereignty_tier = 1;
    dependencies = ["events", "node:http", "node:fs"];
  } else if (rel.includes("archive") || rel.includes("backup") || rel.includes("old") || rel.includes("tmp")) {
    realm = "local_realm";
    category = "archive";
    status = "archived";
    sovereignty_tier = 4;
  }

  return {
    name: name || "unnamed_module",
    category,
    realm,
    dependencies,
    version: "1.0.0",
    status,
    sovereignty_tier,
    file_path: item.relativePath
  };
}
