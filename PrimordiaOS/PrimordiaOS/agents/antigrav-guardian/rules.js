import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load and cache sovereignty and anti-collapse rules from antigrav_rules.json
 */
export class AntigravRulesLoader {
  constructor() {
    this.threshold = 70;
    this.rules = null;
    this.loadRules();
  }

  get threshold() {
    return this.getRules()?.threshold ?? 70;
  }

  set threshold(val) {
    if (this.rules) {
      this.rules.threshold = val;
    }
  }

  loadRules() {
    const candidatePaths = [
      path.resolve(process.cwd(), ".agents", "antigrav_rules.json"),
      path.resolve(__dirname, "..", "..", "..", ".agents", "antigrav_rules.json"),
      path.resolve(__dirname, "..", "antigrav_rules.json")
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, "utf-8");
          this.rules = JSON.parse(raw);
          if (this.rules && (this.rules.threshold === undefined || this.rules.threshold === null)) {
            this.rules.threshold = 70;
          }
          return this.rules;
        } catch (err) {
          console.warn(`[AntigravRulesLoader] Error parsing ${p}:`, err.message);
        }
      }
    }

    // Default canonical rules fallback
    this.rules = {
      antigravVersion: "1.0.0",
      system: "PrimordiaOS",
      threshold: 70,
      scope: {
        domains: ["primordialorigin.com", "api.primordialorigin.com", "cockpit.primordialorigin.com"],
        surfaces: ["dashboards", "analytics_pages", "agent_reports", "automation_logs", "realms"]
      },
      dataSources: {
        allowed: ["supabase.primary", "redirectController.click_logs", "cpa.webhooks", "server.healthchecks", "osmium.ledger", "eventBus.telemetry"],
        forbidden: ["mock_data_arrays", "hardcoded_numeric_literals_as_metrics", "demo_values_in_production", "simulated_estimates_without_source", "infinite_unconstrained_loops"]
      },
      metrics: {
        requiredReal: ["rpm", "epc", "ctr", "clicks", "impressions", "conversions", "revenue"],
        emptyStateRule: {
          onNoData: "SHOW_NO_DATA_STATE",
          forbiddenBehavior: ["display_placeholder_numbers", "display_simulated_metrics"]
        }
      },
      sovereignty: {
        tier0Sovereign: "Shane",
        guardianTier: 2,
        antiCollapseMandate: true,
        highCognitiveFriction: true
      }
    };
    return this.rules;
  }

  getRules() {
    if (!this.rules) {
      this.loadRules();
    }
    return this.rules;
  }

  getForbiddenPatterns() {
    const r = this.getRules();
    return r.dataSources?.forbidden || [];
  }

  getRequiredMetrics() {
    const r = this.getRules();
    return r.metrics?.requiredReal || [];
  }
}

export const rulesLoader = new AntigravRulesLoader();
