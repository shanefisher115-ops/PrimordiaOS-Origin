"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const readline_1 = __importDefault(require("readline"));
const personaLib_1 = require("./personaLib");
const personaAgent_1 = require("./personaAgent");
const messageComposerAgent_1 = require("./messageComposerAgent");
const emailDispatcher_1 = require("./emailDispatcher");
const crmSyncAgent_1 = require("./crmSyncAgent");
const shopHunterAgent_1 = require("./shopHunterAgent");
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
function prompt(query) {
    return new Promise(resolve => rl.question(query, resolve));
}
async function main() {
    const args = process.argv.slice(2);
    const prospects = (0, personaLib_1.loadProspects)();
    const personas = (0, personaLib_1.loadPersonas)();
    if (args.includes("--sync-crm")) {
        const platform = args[args.indexOf("--sync-crm") + 1] || "apollo";
        const campaigns = prospects.map(p => {
            const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
            return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
        });
        console.log(`Syncing ${campaigns.length} campaigns to ${platform}...`);
        const results = await (0, crmSyncAgent_1.syncCampaignsToCrm)(campaigns, platform);
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    }
    console.log("======================================================================");
    console.log("  🚀 PRIMORDIASWARM AUTONOMOUS OUTBOUND ENGINE & CAMPAIGN DISPATCHER");
    console.log("======================================================================");
    console.log(`  👤 Active Sender: ${messageComposerAgent_1.DEFAULT_SENDER_NAME} <${messageComposerAgent_1.DEFAULT_SENDER_EMAIL}>`);
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
                const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
                const camp = (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
                console.log(`\n[${idx + 1}] ${p.company} (${p.firstName} ${p.lastName}) -> Persona: ${persona.id} [${persona.label}]`);
                console.log(`    Recipient: ${p.email}`);
                console.log(`    Subject:   ${camp.touches[0].subject}`);
            });
        }
        else if (choice === "2") {
            const campaigns = prospects.map(p => {
                const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
                return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
            });
            console.log(`\nDispatching Touch 1 to ${campaigns.length} accounts...`);
            const results = await (0, emailDispatcher_1.batchDispatch)(campaigns, 1, (curr, total, res) => {
                console.log(`[${curr}/${total}] ${res.recipient}: ${res.success ? "✓ SENT" : "✗ FAILED"}`);
            }, 1500);
            console.log(`Batch complete! Dispatched: ${results.filter(r => r.success).length}/${results.length}`);
        }
        else if (choice === "3") {
            const region = (await prompt("Enter region (Midwest, West Coast, Texas, All) [default: All]: ")) || "all";
            const results = await (0, shopHunterAgent_1.huntRegionalShops)({ region: region.toLowerCase(), capability: "all", count: 5 });
            console.log(`Discovered & Ingested ${results.discoveredCount} new manufacturing leads!`);
        }
        else if (choice === "4") {
            const campaigns = prospects.map(p => {
                const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
                return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
            });
            console.log(`Syncing ${campaigns.length} campaigns to Apollo...`);
            const res = await (0, crmSyncAgent_1.syncCampaignsToCrm)(campaigns, "apollo");
            console.log(`Synced ${res.pushed} contacts to Apollo!`);
        }
        else if (choice === "5") {
            const target = await prompt("Enter destination email for test: ");
            if (target) {
                const res = await (0, emailDispatcher_1.sendTestEmail)(target);
                console.log(res.success ? `✓ Test email sent to ${target}!` : `✗ Failed: ${res.error}`);
            }
        }
        else if (choice === "6") {
            console.log("Exiting PrimordiaSwarm.");
            break;
        }
    }
    rl.close();
}
if (require.main === module) {
    main().catch(console.error);
}
