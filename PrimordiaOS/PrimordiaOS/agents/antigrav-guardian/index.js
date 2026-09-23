import fs from "node:fs";
import path from "node:path";
import { eventBus } from "../../kernel/event-bus.js";
import { scoringEngine } from "./scoring.js";
import { rulesLoader } from "./rules.js";
import { collapseDetector } from "./collapse-detector.js";

/**
 * AntigravGuardian (Tier 2 Guardian Agent):
 * Audits code, content, and pipeline outputs against the Sovereignty Kernel.
 * Enforces sovereignty threshold >= 70, validates cognitive altitude,
 * and vetoes passive collapse patterns.
 */
export class AntigravGuardian {
  constructor(threshold = 70) {
    this.name = "AntigravGuardian";
    this.tier = 2;
    this.threshold = threshold;
    this.rules = rulesLoader.getRules();
  }

  /**
   * Run ANTIGRAV() audit on proposed artifact, code diff, file, or system state.
   * @param {object|string} targetOrArtifact
   * @param {object} [options]
   * @returns {{
   *   agent: string,
   *   tier: number,
   *   passed: boolean,
   *   score: number,
   *   threshold: number,
   *   metrics: { uniqueness: number, sovereignty: number, friction: number, antiCollapse: number },
   *   flags: string[],
   *   violations: object[],
   *   requiredActions: string[],
   *   feedback: string,
   *   timestamp: number,
   *   target: string
   * }}
   */
  audit(targetOrArtifact = {}, options = {}) {
    let payloadToAudit = targetOrArtifact;
    let targetLabel = "system_workspace";

    // If string is provided, check if it's a file path
    if (typeof targetOrArtifact === "string") {
      targetLabel = targetOrArtifact;
      if (fs.existsSync(targetOrArtifact)) {
        try {
          const stats = fs.statSync(targetOrArtifact);
          if (stats.isFile()) {
            payloadToAudit = fs.readFileSync(targetOrArtifact, "utf-8");
          } else if (stats.isDirectory()) {
            payloadToAudit = `Directory: ${targetOrArtifact}`;
          }
        } catch (err) {
          payloadToAudit = targetOrArtifact;
        }
      }
    } else if (targetOrArtifact && typeof targetOrArtifact === "object") {
      if (targetOrArtifact.target) {
        targetLabel = String(targetOrArtifact.target);
      }
      if (targetOrArtifact.content || targetOrArtifact.code) {
        payloadToAudit = targetOrArtifact.content || targetOrArtifact.code;
      } else if (targetOrArtifact.diff) {
        payloadToAudit = targetOrArtifact.diff;
      } else if (targetOrArtifact.artifact) {
        payloadToAudit = targetOrArtifact.artifact;
      }
    }

    const evalResult = scoringEngine.evaluate(payloadToAudit, {
      threshold: options.threshold || this.threshold
    });

    const report = {
      agent: this.name,
      tier: this.tier,
      passed: evalResult.passed,
      score: evalResult.score,
      threshold: evalResult.threshold,
      uniqueness: evalResult.metrics.uniqueness,
      sovereignty: evalResult.metrics.sovereignty,
      friction: evalResult.metrics.friction,
      metrics: evalResult.metrics,
      flags: evalResult.flags,
      violations: evalResult.violations,
      requiredActions: evalResult.requiredActions,
      feedback: evalResult.summary,
      timestamp: Date.now(),
      target: targetLabel
    };

    // Broadcast audit completion event on the Master Spine EventBus
    try {
      eventBus.emitRealmEvent("ANTIGRAV_AUDIT_COMPLETED", report, "local_realm");
    } catch (err) {
      // Graceful fallback if eventBus is not yet initialized
    }

    return report;
  }

  /**
   * Audit a specific source code file.
   * @param {string} filePath
   * @param {object} [options]
   */
  evaluateFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found for ANTIGRAV() audit: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return this.audit({ target: filePath, content }, options);
  }

  /**
   * Audit raw source code in memory.
   * @param {string} code
   * @param {string} [filename="in_memory.js"]
   * @param {object} [options]
   */
  evaluateCode(code, filename = "in_memory.js", options = {}) {
    return this.audit({ target: filename, content: code }, options);
  }

  /**
   * Audit a git or structural diff object.
   * @param {object} diff
   * @param {object} [options]
   */
  evaluateDiff(diff, options = {}) {
    return this.audit({ target: "diff", diff }, options);
  }
}

export const antigravGuardian = new AntigravGuardian();
export { scoringEngine, rulesLoader, collapseDetector };
export default antigravGuardian;
