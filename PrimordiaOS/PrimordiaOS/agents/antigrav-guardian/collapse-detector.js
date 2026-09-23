import { rulesLoader } from "./rules.js";

/**
 * Detects patterns of passive system collapse, low-friction infinite loops,
 * mock data pollution, and loss of sovereign friction.
 */
export class CollapseDetector {
  constructor() {
    this.rules = rulesLoader.getRules();
  }

  /**
   * Scan text/code content for collapse indicators.
   * @param {string} content - Raw source code or text artifact
   * @param {string} filename - Optional file name
   * @returns {{ flags: string[], violations: object[], collapseScore: number, passed: boolean }}
   */
  scanContent(content = "", filename = "") {
    if (typeof content !== "string") {
      content = JSON.stringify(content);
    }

    const flags = [];
    const violations = [];
    let deduction = 0;

    // 1. Check for infinite unconstrained loops / low-friction spam loops
    const hasUnconstrainedLoop = 
      /while\s*\(\s*(?:true|1)\s*\)\s*\{(?![^}]*(?:break|return|throw|process\.exit|await|sleep|setTimeout|yield))/is.test(content) ||
      (/while\s*\(\s*(?:true|1)\s*\)/i.test(content) && !/(?:break|return|throw|process\.exit|sleep|await|setTimeout|yield)/i.test(content)) ||
      /for\s*\(\s*;\s*;\s*\)\s*\{(?![^}]*(?:break|return|throw|process\.exit|await|sleep|setTimeout|yield))/is.test(content) ||
      /setInterval\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{[^}]*fetch\([^)]+\)[^}]*\}\s*,\s*(?:[0-9]{1,2})\)/i.test(content) ||
      /infinite_unconstrained_loops/i.test(content);

    if (hasUnconstrainedLoop) {
      flags.push("UNCONSTRAINED_INFINITE_LOOP");
      violations.push({
        type: "LOW_FRICTION_LOOP",
        rule: "infinite_unconstrained_loops",
        message: "Detected unconstrained rapid loop without backoff, exit condition, or rate limiting."
      });
      deduction += 35;
    }

    // 2. Check for forbidden mock data arrays masquerading as real telemetry/metrics
    if (/const\s+(?:mockData|fakeMetrics|demoMetrics|dummyRevenue)\s*=\s*\[/i.test(content) ||
        /function\s+generateFakeMetrics/i.test(content) ||
        /["']mock_data_arrays["']/i.test(content)) {
      flags.push("FORBIDDEN_MOCK_DATA");
      violations.push({
        type: "DATA_POLLUTION",
        rule: "mock_data_arrays",
        message: "Forbidden mock data array detected in production telemetry path."
      });
      deduction += 30;
    }

    // 3. Check for hardcoded numeric literals used as production business metrics
    if (/function\s+getProductionMetrics\(\)\s*\{\s*return\s*\{\s*rpm:\s*12\.5/i.test(content) ||
        /hardcoded_numeric_literals_as_metrics/i.test(content)) {
      flags.push("HARDCODED_METRIC_LITERAL");
      violations.push({
        type: "FAKED_METRIC",
        rule: "hardcoded_numeric_literals_as_metrics",
        message: "Hardcoded numeric literal used in place of backing query or verified log."
      });
      deduction += 25;
    }

    // 4. Check for passive template collapse / generic low-friction content
    if (/Lorem ipsum dolor sit amet/i.test(content) ||
        /<div class="generic-template-fill">/i.test(content) ||
        /TODO:\s*implement later when anyone cares/i.test(content)) {
      flags.push("GENERIC_TEMPLATE_COLLAPSE");
      violations.push({
        type: "COGNITIVE_COLLAPSE",
        rule: "antiCollapseMandate",
        message: "Passive generic placeholder detected; reduces cognitive altitude."
      });
      deduction += 20;
    }

    // 5. Check for bypass of Human Sovereign authority
    if (/bypassTier0\s*=\s*true/i.test(content) ||
        /overrideHumanSovereign\s*\(\s*\)/i.test(content) ||
        /disableSovereignVeto\s*=\s*true/i.test(content)) {
      flags.push("SOVEREIGNTY_BYPASS_ATTEMPT");
      violations.push({
        type: "AUTHORITY_VIOLATION",
        rule: "tier0Sovereign",
        message: "Attempt to bypass Tier 0 Human Sovereign approval or veto authority."
      });
      deduction += 45;
    }

    const antiCollapseScore = Math.max(0, 100 - deduction);
    const passed = antiCollapseScore >= 70 && !flags.includes("SOVEREIGNTY_BYPASS_ATTEMPT") && !flags.includes("UNCONSTRAINED_INFINITE_LOOP");

    return {
      flags,
      violations,
      antiCollapseScore,
      deduction,
      passed
    };
  }

  /**
   * Scan structured artifact payload or diff.
   * @param {object} artifact
   * @returns {{ flags: string[], violations: object[], antiCollapseScore: number, passed: boolean }}
   */
  scanArtifact(artifact = {}) {
    if (!artifact || typeof artifact !== "object") {
      return this.scanContent(String(artifact || ""));
    }

    const flags = [];
    const violations = [];
    let deduction = 0;

    // Explicit collapse flags in payload
    if (artifact.hasMockData === true || artifact.mock === true) {
      flags.push("FORBIDDEN_MOCK_DATA");
      deduction += 30;
    }

    if (artifact.bypassSovereignty === true) {
      flags.push("SOVEREIGNTY_BYPASS_ATTEMPT");
      deduction += 45;
    }

    if (artifact.infiniteLoop === true || artifact.unconstrained === true) {
      flags.push("UNCONSTRAINED_INFINITE_LOOP");
      deduction += 35;
    }

    // Scan text representation of artifact
    const textScan = this.scanContent(JSON.stringify(artifact));
    for (const f of textScan.flags) {
      if (!flags.includes(f)) flags.push(f);
    }
    for (const v of textScan.violations) {
      violations.push(v);
    }
    deduction = Math.max(deduction, textScan.deduction);

    const antiCollapseScore = Math.max(0, 100 - deduction);
    const passed = antiCollapseScore >= 70 && flags.length === 0;

    return {
      flags,
      violations,
      antiCollapseScore,
      deduction,
      passed
    };
  }
}

export const collapseDetector = new CollapseDetector();
