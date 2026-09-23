import fs from "fs";
import path from "path";
import { CampaignPackage } from "./types";

export interface CrmConfig {
  activeProvider: "instantly" | "lemlist" | "apollo" | "hubspot" | "webhook" | "sandbox";
  instantly?: {
    apiKey: string;
    campaignId?: string;
  };
  lemlist?: {
    apiKey: string;
    campaignId?: string;
  };
  apollo?: {
    apiKey: string;
  };
  hubspot?: {
    accessToken: string;
  };
  webhook?: {
    url: string;
  };
}

export interface SyncResult {
  recipient: string;
  company: string;
  platform: string;
  success: boolean;
  platformLeadId?: string;
  error?: string;
  isSandbox: boolean;
  payloadSummary: Record<string, any>;
}

export interface CrmSyncSummary {
  provider: string;
  isSandbox: boolean;
  totalLeads: number;
  syncedCount: number;
  failedCount: number;
  results: SyncResult[];
  timestamp: string;
}

const CRM_CONFIG_PATH = path.join(__dirname, "..", "config", "crm.json");

export function loadCrmConfig(): CrmConfig {
  if (fs.existsSync(CRM_CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CRM_CONFIG_PATH, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      // fallback
    }
  }

  return {
    activeProvider: "apollo",
    apollo: {
      apiKey: "REDACTED"
    }
  };
}

export function saveCrmConfig(config: CrmConfig): void {
  fs.writeFileSync(CRM_CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function buildLeadPayload(campaign: CampaignPackage): Record<string, any> {
  const p = campaign.prospect;
  const t1 = campaign.touches.find(t => t.step === 1);
  const t2 = campaign.touches.find(t => t.step === 2);
  const t3 = campaign.touches.find(t => t.step === 3);
  const t4 = campaign.touches.find(t => t.step === 4);

  return {
    email: p.email || `${p.role.toLowerCase().replace(/[^a-z]/g, "")}@${p.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    first_name: p.firstName || "",
    last_name: p.lastName || "",
    company_name: p.company,
    job_title: p.role,
    custom_variables: {
      persona_id: campaign.persona.id,
      persona_label: campaign.persona.label,
      confidence: `${(campaign.classification.confidence * 100).toFixed(0)}%`,
      roi_metric: campaign.roiCalculation,
      machines: (p.machines || []).join(", "),
      materials: (p.materials || []).join(", "),
      region: p.region || "US",
      sender_email: campaign.fromEmail,
      sender_name: campaign.fromName,
      touch1_subject: t1?.subject || "",
      touch1_body: t1?.body || "",
      touch2_subject: t2?.subject || "",
      touch2_body: t2?.body || "",
      touch3_subject: t3?.subject || "",
      touch3_body: t3?.body || "",
      touch4_subject: t4?.subject || "",
      touch4_body: t4?.body || ""
    }
  };
}

export async function syncCampaignsToCrm(
  campaigns: CampaignPackage[],
  targetProvider?: string,
  customConfig?: CrmConfig
): Promise<CrmSyncSummary> {
  const config = customConfig || loadCrmConfig();
  const provider = targetProvider || config.activeProvider || "apollo";

  const summary: CrmSyncSummary = {
    provider,
    isSandbox: false,
    totalLeads: campaigns.length,
    syncedCount: 0,
    failedCount: 0,
    results: [],
    timestamp: new Date().toISOString()
  };

  for (const campaign of campaigns) {
    const p = campaign.prospect;
    const payload = buildLeadPayload(campaign);
    const recipient = payload.email;
    const company = payload.company_name;

    try {
      if (provider === "apollo" && config.apollo?.apiKey && !config.apollo.apiKey.includes("YOUR_")) {
        // Apollo.io Live Contact Creation API
        const apolloRes = await fetch("https://api.apollo.io/v1/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": config.apollo.apiKey
          },
          body: JSON.stringify({
            first_name: p.firstName || p.role.split(" ")[0] || "Operations",
            last_name: p.lastName || "Lead",
            email: recipient,
            title: p.role,
            organization_name: p.company,
            present_raw_address: p.region,
            label_names: [
              "PrimordiaSwarm",
              `Persona-${campaign.persona.id}`,
              `${(campaign.classification.confidence * 100).toFixed(0)}%-Fit`
            ]
          })
        });

        const apolloData = await apolloRes.json();
        if (apolloData.contact && apolloData.contact.id) {
          summary.syncedCount++;
          summary.results.push({
            recipient,
            company,
            platform: "Apollo.io",
            success: true,
            platformLeadId: apolloData.contact.id,
            isSandbox: false,
            payloadSummary: payload
          });
        } else {
          summary.failedCount++;
          summary.results.push({
            recipient,
            company,
            platform: "Apollo.io",
            success: false,
            error: apolloData.error || apolloData.message || JSON.stringify(apolloData),
            isSandbox: false,
            payloadSummary: payload
          });
        }
      } else if (provider === "instantly" && config.instantly?.apiKey && !config.instantly.apiKey.includes("YOUR_")) {
        const res = await fetch("https://api.instantly.ai/api/v1/lead/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: config.instantly.apiKey,
            campaign_id: config.instantly.campaignId || undefined,
            skip_if_in_workspace: false,
            ...payload
          })
        });

        const data = await res.json();
        summary.syncedCount++;
        summary.results.push({
          recipient,
          company,
          platform: "Instantly.ai",
          success: true,
          platformLeadId: data.id || `instantly-${Date.now()}`,
          isSandbox: false,
          payloadSummary: payload
        });
      } else if (provider === "webhook" && config.webhook?.url) {
        const res = await fetch(config.webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "primordia.lead.created",
            lead: payload,
            campaign: {
              persona: campaign.persona,
              roi: campaign.roiCalculation,
              touches: campaign.touches
            }
          })
        });

        summary.syncedCount++;
        summary.results.push({
          recipient,
          company,
          platform: "Webhook",
          success: res.ok,
          platformLeadId: `hook-${res.status}`,
          isSandbox: false,
          payloadSummary: payload
        });
      } else {
        // Safe Sandbox Mode (Simulation)
        summary.isSandbox = true;
        summary.syncedCount++;
        summary.results.push({
          recipient,
          company,
          platform: `${provider.toUpperCase()} (Sandbox Mode)`,
          success: true,
          platformLeadId: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          isSandbox: true,
          payloadSummary: payload
        });
      }
    } catch (err: any) {
      summary.failedCount++;
      summary.results.push({
        recipient,
        company,
        platform: provider,
        success: false,
        error: err.message || String(err),
        isSandbox: summary.isSandbox,
        payloadSummary: payload
      });
    }
  }

  return summary;
}
