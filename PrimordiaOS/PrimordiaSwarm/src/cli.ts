import readline from "readline";
import { loadPersonas, loadProspects, addProspect, saveProspects } from "./personaLib";
import { classifyPersona } from "./personaAgent";
import { composeCampaign, composeEmail, DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME } from "./messageComposerAgent";
import { exportCampaignsToJson, exportLeadsToCsv } from "./exportAgent";
import { loadSmtpConfig, saveSmtpConfig, sendTestEmail, dispatchCampaignTouch, batchDispatch } from "./emailDispatcher";
import { scrapeAndEnrichShop } from "./webEnrichmentAgent";
import { syncCampaignsToCrm } from "./crmSyncAgent";
import { huntRegionalShops } from "./shopHunterAgent";
import { Prospect } from "./types";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

export async function main() {
  const args = process.argv.slice(2);
  const prospects = loadProspects();
  const personas = loadPersonas();

  if (args.includes("--sync-crm")) {
    const platform = (args[args.indexOf("--sync-crm") + 1] as any) || "apollo";
    const campaigns = prospects.map(p => {
      const { persona, result } = classifyPersona(p, personas);
      return composeCampaign(persona, p, result);
    });
    console.log(`Syncing ${campaigns.length} campaigns to ${platform}...`);
    const results = await syncCampaignsToCrm(campaigns, platform);
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }

  console.log("======================================================================");
  console.log("  🚀 PRIMORDIASWARM AUTONOMOUS OUTBOUND ENGINE & CAMPAIGN DISPATCHER");
  console.log("======================================================================");
  console.log(`  👤 Active Sender: ${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`);
  console.log(`  📊 Target Accounts: ${prospects.length} Prospects Loaded\n`);

  while (true) {
    console.log("\n[1] 📋 View All Campaigns & Prospect Dossiers");
    console.log("[2] 🚀 Batch Dispatch All Touch 1 Emails");
    console.log("[3] 🎯 Shop Hunter - Autonomous Lead Discovery");
    console.log("[4] ⚡ Sync Pipeline to Apollo.io");
    console.log("[5] 📨 Send Test Email Verification");
    console.log("[6] 🚪 Exit\n");

    const choice = await prompt("Select option (1-6): ");

    if (choice === "1") {
      prospects.forEach((p, idx) => {
        const { persona, result } = classifyPersona(p, personas);
        const camp = composeCampaign(persona, p, result);
        console.log(`\n[${idx + 1}] ${p.company} (${p.firstName} ${p.lastName}) -> Persona: ${persona.id} [${persona.label}]`);
        console.log(`    Recipient: ${p.email}`);
        console.log(`    Subject:   ${camp.touches[0].subject}`);
      });
    } else if (choice === "2") {
      const campaigns = prospects.map(p => {
        const { persona, result } = classifyPersona(p, personas);
        return composeCampaign(persona, p, result);
      });
      console.log(`\nDispatching Touch 1 to ${campaigns.length} accounts...`);
      const results = await batchDispatch(campaigns, 1, (curr, total, res) => {
        console.log(`[${curr}/${total}] ${res.recipient}: ${res.success ? "✓ SENT" : "✗ FAILED"}`);
      }, 1500);
      console.log(`Batch complete! Dispatched: ${results.filter(r => r.success).length}/${results.length}`);
    } else if (choice === "3") {
      const region = (await prompt("Enter region (Midwest, West Coast, Texas, All) [default: All]: ")) || "all";
      const results = await huntRegionalShops({ region: region.toLowerCase() as any, capability: "all", count: 5 });
      console.log(`Discovered & Ingested ${results.discoveredCount} new manufacturing leads!`);
    } else if (choice === "4") {
      const campaigns = prospects.map(p => {
        const { persona, result } = classifyPersona(p, personas);
        return composeCampaign(persona, p, result);
      });
      console.log(`Syncing ${campaigns.length} campaigns to Apollo...`);
      const res = await syncCampaignsToCrm(campaigns, "apollo");
      console.log(`Synced ${res.pushed} contacts to Apollo!`);
    } else if (choice === "5") {
      const target = await prompt("Enter destination email for test: ");
      if (target) {
        const res = await sendTestEmail(target);
        console.log(res.success ? `✓ Test email sent to ${target}!` : `✗ Failed: ${res.error}`);
      }
    } else if (choice === "6") {
      console.log("Exiting PrimordiaSwarm.");
      break;
    }
  }

  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}