import fs from 'fs';

const API_KEY = "REDACTED";
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const personas = {
  tier_architect: {
    system: "You are the Chief Strategy Officer. Design 3 SaaS subscription tiers for a CAD platform.",
    schema: "{ \"tiers\": [{ \"tier_name\": \"string\", \"price_monthly\": number, \"price_annual\": number, \"target_demographic\": \"string\", \"positioning\": \"string\", \"features\": [\"string\"] }] }"
  },
  oracle_scraper: {
    system: "You are the Lead Generation Oracle. Output search queries for architectural and engineering firms.",
    schema: "{ \"profiles\": [{ \"role_title\": \"string\", \"industry\": \"string\", \"company_size\": \"string\", \"boolean_query\": \"string\", \"target_platforms\": [\"string\"] }] }"
  },
  forge_producer: {
    system: "You are the Post-Production Director. Generate video rendering specifications for high-velocity demo reels.",
    schema: "{ \"reel_spec\": { \"hook\": \"string\", \"duration_seconds\": 15, \"aspect_ratios\": [\"9:16\", \"16:9\"], \"visual_directives\": [{ \"timestamp\": \"string\", \"shot_description\": \"string\", \"ui_overlay\": \"string\", \"camera_motion\": \"string\" }] } }"
  },
  social_herald: {
    system: "You are the Performance Marketing Director. Generate B2B and consumer ad copies using provided tiers and creative hooks.",
    schema: "{ \"campaigns\": [{ \"platform\": \"string\", \"target_tier\": \"string\", \"angle\": \"string\", \"hook\": \"string\", \"copy\": \"string\", \"call_to_action\": \"string\", \"hashtags\": [\"string\"] }] }"
  }
};

async function callGemini(systemPrompt, userPrompt, schema) {
  const prompt = `${systemPrompt}\n\nTask: ${userPrompt}\n\nReturn strictly valid JSON matching this schema:\n${schema}`;
  
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const rawText = json.candidates[0].content.parts[0].text;
  return JSON.parse(rawText);
}

async function executeNode(nodeId, promptDetails) {
  console.log(`[Swarm] ⚙️  Dispatching Node: ${nodeId}...`);
  const config = personas[nodeId];
  const payload = await callGemini(config.system, promptDetails, config.schema);
  console.log(`[Swarm] ✅ ${nodeId} generated successfully.`);
  return payload;
}

async function runSwarm() {
  console.log("\n=======================================================");
  console.log("       PRIMORDIA SWARM: HIVE MIND ACTIVATED           ");
  console.log("=======================================================\n");

  const results = {};

  // Phase 1: Strategic Foundations (Parallel)
  console.log("[Phase 1] Executing Tier Architect & Oracle Scraper...");
  const [tiers, leads] = await Promise.all([
    executeNode('tier_architect', "Create Starter, Pro, and Enterprise tiers for a high-performance web CAD engine."),
    executeNode('oracle_scraper', "Find 4 high-converting CAD buyer ICPs and Boolean search queries.")
  ]);

  results.tier_architect = tiers;
  results.oracle_scraper = leads;

  // Phase 2: Video Asset Definition
  console.log("\n[Phase 2] Executing Forge Producer...");
  const reel = await executeNode('forge_producer', "Script a 15-second teaser on Real-Time Parametric Assembly.");
  results.forge_producer = reel;

  // Phase 3: Social Herald (Context-Aware)
  console.log("\n[Phase 3] Executing Social Herald (Context-Aware)...");
  const heraldPrompt = `
PRICING CONTEXT: ${JSON.stringify(tiers)}
VIDEO CREATIVE CONTEXT: ${JSON.stringify(reel)}
Generate 4 targeted ads (2 for LinkedIn B2B, 2 for X/Twitter).`;

  const ads = await executeNode('social_herald', heraldPrompt);
  results.social_herald = ads;

  // Save full results to disk
  fs.writeFileSync('swarm_output.json', JSON.stringify(results, null, 2));
  
  console.log("\n=======================================================");
  console.log("🎉 ALL 4 SWARM NODES EXECUTED SUCCESSFULLY!");
  console.log("📁 Results written to 'swarm_output.json'");
  console.log("=======================================================\n");
  
  console.log(JSON.stringify(results, null, 2));
}

runSwarm().catch(err => {
  console.error("\n❌ Swarm Execution Error:", err.message);
});
