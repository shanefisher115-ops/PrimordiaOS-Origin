"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const personaLib_1 = require("./personaLib");
const personaAgent_1 = require("./personaAgent");
const messageComposerAgent_1 = require("./messageComposerAgent");
const exportAgent_1 = require("./exportAgent");
const emailDispatcher_1 = require("./emailDispatcher");
const webEnrichmentAgent_1 = require("./webEnrichmentAgent");
const crmSyncAgent_1 = require("./crmSyncAgent");
const shopHunterAgent_1 = require("./shopHunterAgent");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "public")));
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}
// GET /api/data - Full dashboard payload
app.get("/api/data", (req, res) => {
    try {
        const personas = (0, personaLib_1.loadPersonas)();
        const prospects = (0, personaLib_1.loadProspects)();
        const campaigns = prospects.map(p => {
            const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
            const camp = (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
            return {
                ...camp,
                slug: slugify(p.company)
            };
        });
        const stats = {
            totalProspects: prospects.length,
            p1Count: campaigns.filter(c => c.persona.id === "P1").length,
            p2Count: campaigns.filter(c => c.persona.id === "P2").length,
            p3Count: campaigns.filter(c => c.persona.id === "P3").length,
            avgConfidence: campaigns.length > 0
                ? (campaigns.reduce((acc, c) => acc + c.classification.confidence, 0) / campaigns.length) * 100
                : 0,
            sender: {
                name: messageComposerAgent_1.DEFAULT_SENDER_NAME,
                email: messageComposerAgent_1.DEFAULT_SENDER_EMAIL
            },
            smtpConfig: (0, emailDispatcher_1.loadSmtpConfig)(),
            crmConfig: (0, crmSyncAgent_1.loadCrmConfig)()
        };
        res.json({
            success: true,
            stats,
            personas,
            campaigns
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/hunt - Autonomous Shop Hunter Discovery Swarm
app.post("/api/hunt", async (req, res) => {
    try {
        const { capability, region, count, autoSyncApollo } = req.body;
        const result = await (0, shopHunterAgent_1.huntRegionalShops)({
            capability: capability || "all",
            region: region || "all",
            count: parseInt(count || "5", 10),
            autoSyncApollo: autoSyncApollo !== false
        });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /demo/:slug - Serve Interactive 3D Simulation & ROI page
app.get("/demo/:slug", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "..", "public", "demo.html"));
});
// GET /api/demo/:slug - Return tailored prospect & campaign data for 3D demo
app.get("/api/demo/:slug", (req, res) => {
    try {
        const slugParam = req.params.slug;
        const targetSlug = (Array.isArray(slugParam) ? slugParam[0] : (slugParam || "")).toLowerCase();
        const prospects = (0, personaLib_1.loadProspects)();
        const personas = (0, personaLib_1.loadPersonas)();
        const matchedProspect = prospects.find(p => {
            const s = slugify(p.company);
            return s === targetSlug || s.includes(targetSlug) || targetSlug.includes(s);
        }) || prospects[0];
        const { persona, result } = (0, personaAgent_1.classifyPersona)(matchedProspect, personas);
        const campaign = (0, messageComposerAgent_1.composeCampaign)(persona, matchedProspect, result);
        res.json({
            success: true,
            slug: slugify(matchedProspect.company),
            campaign
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/crm/sync - 1-Click Outbound / CRM Push
app.post("/api/crm/sync", async (req, res) => {
    try {
        const { provider, config, prospectIndices } = req.body;
        const prospects = (0, personaLib_1.loadProspects)();
        const personas = (0, personaLib_1.loadPersonas)();
        let targetProspects = prospects;
        if (Array.isArray(prospectIndices) && prospectIndices.length > 0) {
            targetProspects = prospectIndices.map((i) => prospects[i]).filter(Boolean);
        }
        const campaigns = targetProspects.map(p => {
            const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
            return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
        });
        const summary = await (0, crmSyncAgent_1.syncCampaignsToCrm)(campaigns, provider, config);
        res.json({ success: true, summary });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/enrich - Scrape & Enrich from Website URL
app.post("/api/enrich", async (req, res) => {
    try {
        const { url, overrides } = req.body;
        if (!url || typeof url !== "string") {
            return res.status(400).json({ success: false, error: "Target website URL is required." });
        }
        const result = await (0, webEnrichmentAgent_1.scrapeAndEnrichShop)(url, overrides, true);
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/prospects - Add new prospect manually
app.post("/api/prospects", (req, res) => {
    try {
        const { company, firstName, lastName, role, email, machines, materials, region, companySize, painTrigger } = req.body;
        if (!company) {
            return res.status(400).json({ success: false, error: "Company name is required." });
        }
        const newProspect = {
            company,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            role: role || "Operations Lead",
            email: email || undefined,
            machines: Array.isArray(machines) ? machines : (machines ? machines.split(",").map((s) => s.trim()) : ["CNC & Laser"]),
            materials: Array.isArray(materials) ? materials : (materials ? materials.split(",").map((s) => s.trim()) : ["Alloys & Steel"]),
            region: region || "US",
            companySize: companySize ? parseInt(companySize, 10) : undefined,
            painTrigger: painTrigger || undefined
        };
        const updatedList = (0, personaLib_1.addProspect)(newProspect);
        const personas = (0, personaLib_1.loadPersonas)();
        const { persona, result } = (0, personaAgent_1.classifyPersona)(newProspect, personas);
        const campaign = (0, messageComposerAgent_1.composeCampaign)(persona, newProspect, result);
        res.json({
            success: true,
            prospect: newProspect,
            campaign,
            totalCount: updatedList.length
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/dispatch/test - Send test email
app.post("/api/dispatch/test", async (req, res) => {
    try {
        const { toEmail } = req.body;
        if (!toEmail || !toEmail.includes("@")) {
            return res.status(400).json({ success: false, error: "Valid email address required." });
        }
        const result = await (0, emailDispatcher_1.sendTestEmail)(toEmail);
        res.json({ success: result.success, result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/dispatch/touch - Dispatch specific touch to prospect
app.post("/api/dispatch/touch", async (req, res) => {
    try {
        const { prospectIndex, touchStep } = req.body;
        const prospects = (0, personaLib_1.loadProspects)();
        const personas = (0, personaLib_1.loadPersonas)();
        if (prospectIndex === undefined || prospectIndex < 0 || prospectIndex >= prospects.length) {
            return res.status(400).json({ success: false, error: "Invalid prospect index." });
        }
        const prospect = prospects[prospectIndex];
        const { persona, result } = (0, personaAgent_1.classifyPersona)(prospect, personas);
        const campaign = (0, messageComposerAgent_1.composeCampaign)(persona, prospect, result);
        const dispatchResult = await (0, emailDispatcher_1.dispatchCampaignTouch)(campaign, touchStep || 1);
        res.json({ success: dispatchResult.success, dispatchResult });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/dispatch/batch - Batch dispatch all emails with throttle
app.post("/api/dispatch/batch", async (req, res) => {
    try {
        const { touchStep, prospectIndices, delayMs } = req.body;
        const prospects = (0, personaLib_1.loadProspects)();
        const personas = (0, personaLib_1.loadPersonas)();
        let targetProspects = prospects;
        if (Array.isArray(prospectIndices) && prospectIndices.length > 0) {
            targetProspects = prospectIndices.map((i) => prospects[i]).filter(Boolean);
        }
        const campaigns = targetProspects.map(p => {
            const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
            return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
        });
        const results = await (0, emailDispatcher_1.batchDispatch)(campaigns, touchStep || 1, undefined, delayMs || 800);
        const successCount = results.filter(r => r.success).length;
        res.json({
            success: true,
            total: results.length,
            successCount,
            failedCount: results.length - successCount,
            results
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/export/csv - Download leads CSV
app.get("/api/export/csv", (req, res) => {
    try {
        const prospects = (0, personaLib_1.loadProspects)();
        const personas = (0, personaLib_1.loadPersonas)();
        const campaigns = prospects.map(p => {
            const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
            return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
        });
        const csvPath = (0, exportAgent_1.exportLeadsToCsv)(campaigns);
        res.download(csvPath, "primordia_outbound_leads.csv");
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/export/json - Download campaign JSON
app.get("/api/export/json", (req, res) => {
    try {
        const prospects = (0, personaLib_1.loadProspects)();
        const personas = (0, personaLib_1.loadPersonas)();
        const campaigns = prospects.map(p => {
            const { persona, result } = (0, personaAgent_1.classifyPersona)(p, personas);
            return (0, messageComposerAgent_1.composeCampaign)(persona, p, result);
        });
        const jsonPath = (0, exportAgent_1.exportCampaignsToJson)(campaigns);
        res.download(jsonPath, "primordia_campaign_export.json");
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/smtp - Update SMTP config
app.post("/api/smtp", (req, res) => {
    try {
        const { provider, host, port, user, pass, secure } = req.body;
        const config = {
            provider: provider === "smtp" ? "smtp" : "sandbox",
            smtp: provider === "smtp" ? {
                host: host || "mail.primordialorigin.com",
                port: parseInt(port || "465", 10),
                secure: secure !== false,
                auth: {
                    user: user || messageComposerAgent_1.DEFAULT_SENDER_EMAIL,
                    pass: pass || ""
                }
            } : undefined,
            defaults: {
                fromEmail: messageComposerAgent_1.DEFAULT_SENDER_EMAIL,
                fromName: messageComposerAgent_1.DEFAULT_SENDER_NAME,
                replyTo: messageComposerAgent_1.DEFAULT_SENDER_EMAIL
            }
        };
        (0, emailDispatcher_1.saveSmtpConfig)(config);
        res.json({ success: true, config });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`\n\x1b[32m======================================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m  🚀 PRIMORDIASWARM COMMAND CENTER & SHOP HUNTER ONLINE\x1b[0m`);
    console.log(`\x1b[32m======================================================================\x1b[0m`);
    console.log(`  🔗 Dashboard:        \x1b[1m\x1b[35mhttp://localhost:${PORT}\x1b[0m`);
    console.log(`  🎮 3D Sim Demo:      \x1b[1m\x1b[36mhttp://localhost:${PORT}/demo/spacex\x1b[0m`);
    console.log(`  🎯 Shop Hunter:      \x1b[1m\x1b[32mActive (Ready to Discover Regional Leads)\x1b[0m`);
    console.log(`  👤 Sender Identity:  ${messageComposerAgent_1.DEFAULT_SENDER_NAME} <${messageComposerAgent_1.DEFAULT_SENDER_EMAIL}>`);
    console.log(`\x1b[32m======================================================================\x1b[0m\n`);
});
