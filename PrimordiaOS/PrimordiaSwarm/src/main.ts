import { Prospect, CampaignPackage } from "./types";
import { loadProspects, loadPersonas } from "./personaLib";
import { classifyPersona } from "./personaAgent";
import { composeEmail, composeCampaign, DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME } from "./messageComposerAgent";
import { exportCampaignsToJson, exportLeadsToCsv } from "./exportAgent";

const defaultProspects: Prospect[] = [
  {
    firstName: "John",
    company: "Atlas Laser Fab",
    role: "Laser Programmer",
    machines: ["Trumpf TruLaser 5030 fiber laser"],
    materials: ["mild steel", "304 stainless"],
    region: "US",
    companySize: 45,
    painTrigger: "Tip-up slugs causing head crashes during rapid traverses"
  },
  {
    firstName: "Elena",
    company: "AeroMed Alloys",
    role: "VP of Manufacturing Engineering",
    machines: ["15kW Fiber laser", "Hermle C42 5-Axis CNC"],
    materials: ["Ti-6Al-4V", "316L", "Inconel 718"],
    region: "US",
    companySize: 185,
    painTrigger: "Severe thermal distortion and high scrap rates on titanium plate nests"
  },
  {
    firstName: "Marcus",
    company: "Unified CNC & Weld",
    role: "Production Engineer",
    machines: ["5-axis CNC", "OTC Daihen robotic welder"],
    materials: ["carbon steel", "4140 chromoly"],
    region: "EU",
    companySize: 70,
    painTrigger: "Software silos between CAD/CAM seats and retiring senior machinists"
  }
];

function runSwarm() {
  console.log("\x1b[36m======================================================================\x1b[0m");
  console.log("\x1b[1m\x1b[35m  🚀 PRIMORDIASWARM — Autonomous B2B Manufacturing Outbound Engine\x1b[0m");
  console.log("\x1b[36m======================================================================\x1b[0m");
  console.log(`[Sender Identity]: \x1b[1m${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>\x1b[0m\n`);

  const personas = loadPersonas();
  let prospects = loadProspects();
  if (!prospects || prospects.length === 0) {
    prospects = defaultProspects;
  }

  console.log(`[✓] Loaded ${personas.length} Persona Blueprints`);
  console.log(`[✓] Ingested ${prospects.length} Target Manufacturing Prospects\n`);

  const campaigns: CampaignPackage[] = [];

  for (let i = 0; i < prospects.length; i++) {
    const prospect = prospects[i];
    const { persona, result } = classifyPersona(prospect, personas);
    const campaign = composeCampaign(persona, prospect, result);
    campaigns.push(campaign);

    const email = composeEmail(persona, prospect);

    console.log("\x1b[33m──────────────────────────────────────────────────────────────────────\x1b[0m");
    console.log(`\x1b[1mPROSPECT #${i + 1}: ${prospect.company}\x1b[0m (${prospect.firstName ? prospect.firstName + " - " : ""}${prospect.role})`);
    console.log(`\x1b[32mTarget Persona:\x1b[0m [${persona.id}] ${persona.label}`);
    console.log(`\x1b[34mClassification:\x1b[0m Confidence: \x1b[1m${(result.confidence * 100).toFixed(0)}%\x1b[0m | Scores: P1=${result.scoreBreakdown.P1} pts, P2=${result.scoreBreakdown.P2} pts, P3=${result.scoreBreakdown.P3} pts`);
    console.log(`\x1b[37mRationale:\x1b[0m ${result.rationale}`);
    console.log(`\x1b[36mEstimated ROI:\x1b[0m ${campaign.roiCalculation}`);
    console.log("──────────────────────────────────────────────────────────────────────");
    console.log(`\x1b[1m📧 TOUCH 1 EMAIL (Initial Value Hook):\x1b[0m`);
    console.log(`\x1b[35mFrom:\x1b[0m ${campaign.fromName} <${campaign.fromEmail}>`);
    console.log(`\x1b[35mTo:\x1b[0m ${prospect.email || `${prospect.role.toLowerCase().replace(/[^a-z]/g, "")}@${prospect.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`}`);
    console.log(`\x1b[33mSubject:\x1b[0m ${email.subject}`);
    console.log("\n" + email.body + "\n");

    const t2 = campaign.touches.find(t => t.step === 2);
    if (t2) {
      console.log(`\x1b[2m↳ Touch 2 (Day 3): "${t2.touchName}" [Sim Video Link]\x1b[0m`);
    }
    const t3 = campaign.touches.find(t => t.step === 3);
    if (t3) {
      console.log(`\x1b[2m↳ Touch 3 (Day 7): "${t3.touchName}" [ROI Benchmark]\x1b[0m`);
    }
    const t4 = campaign.touches.find(t => t.step === 4);
    if (t4) {
      console.log(`\x1b[2m↳ Touch 4 (Day 12): "${t4.touchName}" [Break-up / CAM Checklist]\x1b[0m`);
    }
    console.log("");
  }

  // Generate automated export files
  const jsonPath = exportCampaignsToJson(campaigns);
  const csvPath = exportLeadsToCsv(campaigns);

  console.log("\x1b[32m======================================================================\x1b[0m");
  console.log("\x1b[1m\x1b[32m  ✓ SWARM PIPELINE EXECUTION COMPLETE\x1b[0m");
  console.log("\x1b[32m======================================================================\x1b[0m");
  console.log(`[✓] Sender Configured:      ${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`);
  console.log(`[✓] JSON Export Generated:  ${jsonPath}`);
  console.log(`[✓] CRM/CSV Export Ready:   ${csvPath}`);
  console.log(`[✓] Total Prospects Prepared: ${campaigns.length}`);
  console.log(`[✓] Ready for Instantly / Apollo / Lemlist / HubSpot ingestion.\n`);
}

runSwarm();
