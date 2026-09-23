import express, { Request, Response } from "express";
import path from "path";
import { loadPersonas, loadProspects, addProspect, saveProspects } from "./personaLib";
import { classifyPersona } from "./personaAgent";
import { composeCampaign, composeEmail, DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME } from "./messageComposerAgent";
import { exportCampaignsToJson, exportLeadsToCsv } from "./exportAgent";
import { loadSmtpConfig, saveSmtpConfig, sendTestEmail, dispatchCampaignTouch, batchDispatch, SmtpConfig } from "./emailDispatcher";
import { scrapeAndEnrichShop } from "./webEnrichmentAgent";
import { syncCampaignsToCrm, loadCrmConfig, saveCrmConfig, CrmConfig } from "./crmSyncAgent";
import { huntRegionalShops, HuntRequest } from "./shopHunterAgent";
import { Prospect } from "./types";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET /api/data - Full dashboard payload
app.get("/api/data", (req: Request, res: Response) => {
  try {
    const personas = loadPersonas();
    const prospects = loadProspects();

    const campaigns = prospects.map(p => {
      const { persona, result } = classifyPersona(p, personas);
      const camp = composeCampaign(persona, p, result);
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
        name: DEFAULT_SENDER_NAME,
        email: DEFAULT_SENDER_EMAIL
      },
      smtpConfig: loadSmtpConfig(),
      crmConfig: loadCrmConfig()
    };

    res.json({
      success: true,
      stats,
      personas,
      campaigns
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/hunt - Autonomous Shop Hunter Discovery Swarm
app.post("/api/hunt", async (req: Request, res: Response) => {
  try {
    const { capability, region, count, autoSyncApollo } = req.body;
    const result = await huntRegionalShops({
      capability: capability || "all",
      region: region || "all",
      count: parseInt(count || "5", 10),
      autoSyncApollo: autoSyncApollo !== false
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /demo/:slug - Serve Interactive 3D Simulation & ROI page
app.get("/demo/:slug", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "demo.html"));
});

// GET /api/demo/:slug - Return tailored prospect & campaign data for 3D demo
app.get("/api/demo/:slug", (req: Request, res: Response) => {
  try {
    const slugParam = req.params.slug;
    const targetSlug = (Array.isArray(slugParam) ? slugParam[0] : (slugParam || "")).toLowerCase();
    const prospects = loadProspects();
    const personas = loadPersonas();

    const matchedProspect = prospects.find(p => {
      const s = slugify(p.company);
      return s === targetSlug || s.includes(targetSlug) || targetSlug.includes(s);
    }) || prospects[0];

    const { persona, result } = classifyPersona(matchedProspect, personas);
    const campaign = composeCampaign(persona, matchedProspect, result);

    res.json({
      success: true,
      slug: slugify(matchedProspect.company),
      campaign
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crm/sync - 1-Click Outbound / CRM Push
app.post("/api/crm/sync", async (req: Request, res: Response) => {
  try {
    const { provider, config, prospectIndices } = req.body;
    const prospects = loadProspects();
    const personas = loadPersonas();

    let targetProspects = prospects;
    if (Array.isArray(prospectIndices) && prospectIndices.length > 0) {
      targetProspects = prospectIndices.map((i: number) => prospects[i]).filter(Boolean);
    }

    const campaigns = targetProspects.map(p => {
      const { persona, result } = classifyPersona(p, personas);
      return composeCampaign(persona, p, result);
    });

    const summary = await syncCampaignsToCrm(campaigns, provider, config);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrich - Scrape & Enrich from Website URL
app.post("/api/enrich", async (req: Request, res: Response) => {
  try {
    const { url, overrides } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "Target website URL is required." });
    }

    const result = await scrapeAndEnrichShop(url, overrides, true);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/prospects - Add new prospect manually
app.post("/api/prospects", (req: Request, res: Response) => {
  try {
    const { company, firstName, lastName, role, email, machines, materials, region, companySize, painTrigger } = req.body;

    if (!company) {
      return res.status(400).json({ success: false, error: "Company name is required." });
    }

    const newProspect: Prospect = {
      company,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      role: role || "Operations Lead",
      email: email || undefined,
      machines: Array.isArray(machines) ? machines : (machines ? machines.split(",").map((s: string) => s.trim()) : ["CNC & Laser"]),
      materials: Array.isArray(materials) ? materials : (materials ? materials.split(",").map((s: string) => s.trim()) : ["Alloys & Steel"]),
      region: region || "US",
      companySize: companySize ? parseInt(companySize, 10) : undefined,
      painTrigger: painTrigger || undefined
    };

    const updatedList = addProspect(newProspect);
    const personas = loadPersonas();
    const { persona, result } = classifyPersona(newProspect, personas);
    const campaign = composeCampaign(persona, newProspect, result);

    res.json({
      success: true,
      prospect: newProspect,
      campaign,
      totalCount: updatedList.length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dispatch/test - Send test email
app.post("/api/dispatch/test", async (req: Request, res: Response) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail || !toEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address required." });
    }

    const result = await sendTestEmail(toEmail);
    res.json({ success: result.success, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dispatch/touch - Dispatch specific touch to prospect
app.post("/api/dispatch/touch", async (req: Request, res: Response) => {
  try {
    const { prospectIndex, touchStep } = req.body;
    const prospects = loadProspects();
    const personas = loadPersonas();

    if (prospectIndex === undefined || prospectIndex < 0 || prospectIndex >= prospects.length) {
      return res.status(400).json({ success: false, error: "Invalid prospect index." });
    }

    const prospect = prospects[prospectIndex];
    const { persona, result } = classifyPersona(prospect, personas);
    const campaign = composeCampaign(persona, prospect, result);

    const dispatchResult = await dispatchCampaignTouch(campaign, touchStep || 1);
    res.json({ success: dispatchResult.success, dispatchResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dispatch/batch - Batch dispatch all emails with throttle
app.post("/api/dispatch/batch", async (req: Request, res: Response) => {
  try {
    const { touchStep, prospectIndices, delayMs } = req.body;
    const prospects = loadProspects();
    const personas = loadPersonas();

    let targetProspects = prospects;
    if (Array.isArray(prospectIndices) && prospectIndices.length > 0) {
      targetProspects = prospectIndices.map((i: number) => prospects[i]).filter(Boolean);
    }

    const campaigns = targetProspects.map(p => {
      const { persona, result } = classifyPersona(p, personas);
      return composeCampaign(persona, p, result);
    });

    const results = await batchDispatch(campaigns, touchStep || 1, undefined, delayMs || 800);
    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      total: results.length,
      successCount,
      failedCount: results.length - successCount,
      results
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/csv - Download leads CSV
app.get("/api/export/csv", (req: Request, res: Response) => {
  try {
    const prospects = loadProspects();
    const personas = loadPersonas();
    const campaigns = prospects.map(p => {
      const { persona, result } = classifyPersona(p, personas);
      return composeCampaign(persona, p, result);
    });

    const csvPath = exportLeadsToCsv(campaigns);
    res.download(csvPath, "primordia_outbound_leads.csv");
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/json - Download campaign JSON
app.get("/api/export/json", (req: Request, res: Response) => {
  try {
    const prospects = loadProspects();
    const personas = loadPersonas();
    const campaigns = prospects.map(p => {
      const { persona, result } = classifyPersona(p, personas);
      return composeCampaign(persona, p, result);
    });

    const jsonPath = exportCampaignsToJson(campaigns);
    res.download(jsonPath, "primordia_campaign_export.json");
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/smtp - Update SMTP config
app.post("/api/smtp", (req: Request, res: Response) => {
  try {
    const { provider, host, port, user, pass, secure } = req.body;
    const config: SmtpConfig = {
      provider: provider === "smtp" ? "smtp" : "sandbox",
      smtp: provider === "smtp" ? {
        host: host || "mail.primordialorigin.com",
        port: parseInt(port || "465", 10),
        secure: secure !== false,
        auth: {
          user: user || DEFAULT_SENDER_EMAIL,
          pass: pass || ""
        }
      } : undefined,
      defaults: {
        fromEmail: DEFAULT_SENDER_EMAIL,
        fromName: DEFAULT_SENDER_NAME,
        replyTo: DEFAULT_SENDER_EMAIL
      }
    };

    saveSmtpConfig(config);
    res.json({ success: true, config });
  } catch (err: any) {
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
  console.log(`  👤 Sender Identity:  ${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`);
  console.log(`\x1b[32m======================================================================\x1b[0m\n`);
});
