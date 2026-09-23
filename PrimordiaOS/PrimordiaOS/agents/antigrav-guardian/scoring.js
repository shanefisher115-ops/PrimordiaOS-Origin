import { collapseDetector } from "./collapse-detector.js";
import { rulesLoader } from "./rules.js";

/**
 * Calculates genuine ANTIGRAV() audit metrics across Uniqueness, Sovereignty,
 * Cognitive Friction, and Anti-Collapse compliance.
 */
export class AntigravScoringEngine {
  constructor() {
    this.threshold = 70;
  }

  /**
   * Evaluate an artifact, code snippet, diff, or system state.
   * @param {object|string} input
   * @param {object} [options]
   * @returns {{
   *   passed: boolean,
   *   score: number,
   *   threshold: number,
   *   metrics: { uniqueness: number, sovereignty: number, friction: number, antiCollapse: number },
   *   flags: string[],
   *   violations: object[],
   *   requiredActions: string[],
   *   summary: string
   * }}
   */
  evaluate(input = {}, options = {}) {
    const rules = rulesLoader.getRules();
    const threshold = options.threshold || rules.threshold || this.threshold;

    let textContent = "";
    let isObject = false;

    if (typeof input === "string") {
      textContent = input;
    } else if (input && typeof input === "object") {
      isObject = true;
      textContent = JSON.stringify(input);
    }

    // 1. Run Collapse Detection
    const collapseResult = collapseDetector.scanArtifact(input);
    const antiCollapseScore = collapseResult.antiCollapseScore;
    const flags = [...collapseResult.flags];
    const violations = [...collapseResult.violations];
    const requiredActions = [];

    // 2. Compute Uniqueness
    // Base uniqueness is calculated from vocabulary diversity, absence of generic patterns, and length
    let uniqueness = 92;
    if (textContent.length > 0) {
      const words = textContent.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const uniqueWords = new Set(words);
      const lexicalDiversity = words.length > 0 ? (uniqueWords.size / words.length) : 1;
      if (lexicalDiversity < 0.45 && words.length >= 10) {
        uniqueness = Math.min(55, Math.max(15, Math.round(lexicalDiversity * 110)));
      } else {
        uniqueness = Math.min(100, Math.max(50, Math.round(75 + (lexicalDiversity * 25))));
      }
    }
    if (flags.includes("GENERIC_TEMPLATE_COLLAPSE")) {
      uniqueness = Math.min(50, Math.max(20, uniqueness - 40));
      requiredActions.push("Eliminate passive template placeholders and replace with high-altitude sovereign content.");
    }

    // 3. Compute Sovereignty
    let sovereignty = 95;
    if (flags.includes("SOVEREIGNTY_BYPASS_ATTEMPT")) {
      sovereignty = 15;
      requiredActions.push("Restore Tier 0 (Shane) sovereign authority checks and veto hooks.");
    }
    if (flags.includes("FORBIDDEN_MOCK_DATA")) {
      sovereignty = Math.max(30, sovereignty - 40);
      requiredActions.push("Replace forbidden mock data arrays with verified Osmium ledger or Supabase queries.");
    }
    if (flags.includes("HARDCODED_METRIC_LITERAL")) {
      sovereignty = Math.max(35, sovereignty - 35);
      requiredActions.push("Bind metrics directly to real execution logs, telemetry packets, or database records.");
    }

    // 4. Compute Cognitive Friction
    let friction = 90;
    if (flags.includes("UNCONSTRAINED_INFINITE_LOOP")) {
      friction = 10;
      requiredActions.push("Implement deliberate rate limiting, loop_depth limits, and human-in-the-loop inspection gates.");
    }

    // If no flags are present, generate high-sovereignty baseline scores
    if (flags.length === 0) {
      if (uniqueness > 55) {
        uniqueness = Math.min(100, Math.max(85, uniqueness));
      }
      sovereignty = Math.min(100, Math.max(88, sovereignty));
      friction = Math.min(100, Math.max(85, friction));
    }

    // 5. Calculate Weighted Total Score (35% uniqueness, 45% sovereignty, 20% friction)
    const rawTotal = Math.round(
      (uniqueness * 0.35) +
      (sovereignty * 0.45) +
      (friction * 0.20)
    );
    const totalScore = Math.min(100, Math.max(0, rawTotal));

    const passed = totalScore >= threshold && flags.length === 0;

    let summary = "";
    if (passed) {
      summary = `Artifact passes ANTIGRAV() audit with sovereign score ${totalScore}/100. Anti-collapse principles satisfied.`;
    } else {
      summary = `VETO: Artifact failed ANTIGRAV() audit with score ${totalScore}/100 (Threshold: ${threshold}). Detected ${flags.length} collapse flag(s).`;
    }

    return {
      passed,
      score: totalScore,
      threshold,
      metrics: {
        uniqueness,
        sovereignty,
        friction,
        antiCollapse: antiCollapseScore
      },
      flags,
      violations,
      requiredActions,
      summary
    };
  }
}

export const scoringEngine = new AntigravScoringEngine();
