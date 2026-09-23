const webhookUrl = "https://api.primordialorigin.com/webhooks/payout-success";

const mockSwarm = [
  {
    agent_node: "tier_architect",
    payload: {
      tiers: [
        { tier_name: "Starter", price_monthly: 29, price_annual: 290, target_demographic: "Freelance 3D Artists", features: ["1 Active Project", "Standard Mesh Export", "Community Support"] },
        { tier_name: "Pro Studio", price_monthly: 89, price_annual: 890, target_demographic: "Boutique Engineering Firms", features: ["Unlimited Assemblies", "Real-Time Collaboration", "STEP/IGES Export", "Priority Rendering"] },
        { tier_name: "Enterprise Core", price_monthly: 249, price_annual: 2490, target_demographic: "Automotive & Aerospace Teams", features: ["Dedicated GPU Cluster", "SSO/SAML", "Custom API Integrations", "24/7 SLA"] }
      ]
    }
  },
  {
    agent_node: "oracle_scraper",
    payload: {
      profiles: [
        { role_title: "Head of CAD Engineering", industry: "Industrial Design", company_size: "50-200", boolean_query: '("Head of CAD" OR "VP of Engineering") AND ("SolidWorks" OR "Autodesk") AND "Additive Manufacturing"', target_platforms: ["LinkedIn Sales Navigator", "Google Dorks"] },
        { role_title: "Principal Architect", industry: "Commercial Architecture", company_size: "10-50", boolean_query: '("Principal Architect" OR "BIM Manager") AND ("Revit" OR "Rhino 3D") AND "Parametric"', target_platforms: ["LinkedIn", "Clutch.co"] }
      ]
    }
  },
  {
    agent_node: "forge_producer",
    payload: {
      reel_spec: {
        hook: "Cloud CAD that doesn't freeze when 10 engineers edit at once.",
        duration_seconds: 15,
        aspect_ratios: ["9:16", "16:9"],
        visual_directives: [
          { timestamp: "0:00-0:03", shot_description: "Split screen: Traditional CAD spinning wheel of death vs Primordia instant cloud render", ui_overlay: "Legacy CAD vs Primordia Engine", camera_motion: "Fast whip zoom" },
          { timestamp: "0:03-0:09", shot_description: "Multiplayer cursors seamlessly editing a complex parametric turbine assembly", ui_overlay: "Live Parametric Sync: 60 FPS", camera_motion: "Smooth orbit around turbine" },
          { timestamp: "0:09-0:15", shot_description: "One-click export to STEP with instant stress-test simulation UI overlay", ui_overlay: "Start Free in Browser - No Install", camera_motion: "Pull back to branding logo" }
        ]
      }
    }
  },
  {
    agent_node: "social_herald",
    payload: {
      campaigns: [
        { platform: "LinkedIn", target_tier: "Pro Studio", angle: "Productivity / Engineering Velocity", hook: "Stop emailing 2GB STEP files back and forth.", copy: "Modern engineering teams don't have time for version-control lockouts. Primordia enables true multi-user parametric assembly right in your browser.", call_to_action: "Start 14-Day Pro Trial", hashtags: ["#MechanicalEngineering", "#CAD", "#ProductDesign"] },
        { platform: "X", target_tier: "Enterprise Core", angle: "Raw Performance", hook: "WebAssembly + WebGPU CAD engine running a 50,000-part assembly at 60fps.", copy: "We eliminated local desktop installs without sacrificing native GPU compute. Try the live benchmark.", call_to_action: "Launch Demo", hashtags: ["#WebGPU", "#Tech", "#HardwareEng"] }
      ]
    }
  }
];

async function runMockSwarm() {
  console.log("=== EXECUTING TEST SWARM DISPATCH ===");
  for (const node of mockSwarm) {
    console.log(`[Swarm] ⚙️  Transmitting node payload: ${node.agent_node}...`);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primordia_directive: "corporate_swarm_execution",
        agent_node: node.agent_node,
        timestamp: new Date().toISOString(),
        payload: node.payload
      })
    });
    console.log(`[Swarm] ✅ ${node.agent_node} delivered -> Status: ${res.status}`);
  }
  console.log("=== TEST COMPLETED ===");
}

runMockSwarm();
