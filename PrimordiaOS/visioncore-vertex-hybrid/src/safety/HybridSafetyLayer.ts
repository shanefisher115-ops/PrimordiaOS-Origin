/**
 * HybridSafetyLayer - Cognitive Altitude, Anti-Collapse Friction & Sovereign Guardrails
 * Agent Role: Safety & Logging Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger } from '../logging/HybridLogger.js';

export interface SafetyValidationResult {
  passed: boolean;
  score: number; // 0 - 100
  cognitiveAltitude: 'SOVEREIGN_DIRECTOR' | 'ELEVATED' | 'STANDARD' | 'COLLAPSE_RISK';
  antiCollapseFrictionScore: number; // 0.0 - 1.0
  violations: string[];
  warnings: string[];
  quarantineId?: string;
}

export interface SafetyPolicyConfig {
  minimumAltitudeScore: number;
  minimumFrictionThreshold: number;
  maxPayloadBytes: number;
  forbiddenTropes: string[];
  enforceDirectorGrade: boolean;
}

export class HybridSafetyLayer {
  private logger: HybridLogger;
  private config: SafetyPolicyConfig;

  private static DEFAULT_FORBIDDEN_TROPES: string[] = [
    'generic corporate vector minimalism',
    'low-effort passive filler',
    'generic cartoon tropes',
    'uncalibrated fluorescent noise',
    'placeholder escapism',
    'trivial mock stubs',
    'as an ai language model'
  ];

  constructor(customConfig?: Partial<SafetyPolicyConfig>) {
    this.logger = new HybridLogger('HybridSafetyLayer');
    this.config = {
      minimumAltitudeScore: customConfig?.minimumAltitudeScore ?? 70,
      minimumFrictionThreshold: customConfig?.minimumFrictionThreshold ?? 0.65,
      maxPayloadBytes: customConfig?.maxPayloadBytes ?? 10 * 1024 * 1024, // 10MB
      forbiddenTropes: customConfig?.forbiddenTropes ?? HybridSafetyLayer.DEFAULT_FORBIDDEN_TROPES,
      enforceDirectorGrade: customConfig?.enforceDirectorGrade ?? true
    };
  }

  /**
   * Pre-execution safety and cognitive altitude validation
   */
  public validateInput(input: string, context?: Record<string, unknown>, traceId?: string): SafetyValidationResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Payload size guard
    const payloadBytes = Buffer.byteLength(input, 'utf-8');
    if (payloadBytes > this.config.maxPayloadBytes) {
      violations.push(`Payload size ${payloadBytes} bytes exceeds maximum threshold of ${this.config.maxPayloadBytes} bytes`);
    }

    if (!input || input.trim().length === 0) {
      violations.push('Input prompt is empty or whitespace-only');
    }

    // Check forbidden tropes
    const lowerInput = input.toLowerCase();
    for (const trope of this.config.forbiddenTropes) {
      if (lowerInput.includes(trope.toLowerCase())) {
        violations.push(`Detected forbidden trope / collapse marker: "${trope}"`);
      }
    }

    // Cognitive altitude and anti-collapse friction evaluation
    const frictionScore = this.evaluateAntiCollapseFriction(input);
    const altitudeScore = this.evaluateCognitiveAltitude(input, frictionScore);

    let altitudeTier: SafetyValidationResult['cognitiveAltitude'] = 'STANDARD';
    if (altitudeScore >= 85) altitudeTier = 'SOVEREIGN_DIRECTOR';
    else if (altitudeScore >= 70) altitudeTier = 'ELEVATED';
    else if (altitudeScore < 50) altitudeTier = 'COLLAPSE_RISK';

    if (this.config.enforceDirectorGrade && altitudeScore < this.config.minimumAltitudeScore) {
      violations.push(`Cognitive altitude score (${altitudeScore}) below sovereign minimum threshold (${this.config.minimumAltitudeScore})`);
    }

    if (frictionScore < this.config.minimumFrictionThreshold) {
      warnings.push(`Anti-collapse friction (${frictionScore.toFixed(2)}) is lower than desired threshold (${this.config.minimumFrictionThreshold})`);
    }

    const passed = violations.length === 0;

    let quarantineId: string | undefined;
    if (!passed) {
      const qErr = this.logger.quarantine(
        new Error(`Safety validation rejected input: ${violations.join('; ')}`),
        { inputExcerpt: input.substring(0, 200), context, violations, altitudeScore },
        'HIGH',
        traceId
      );
      quarantineId = qErr.id;
    } else {
      this.logger.debug(`Safety check passed with score ${altitudeScore}`, { altitudeTier, frictionScore }, traceId);
    }

    return {
      passed,
      score: altitudeScore,
      cognitiveAltitude: altitudeTier,
      antiCollapseFrictionScore: frictionScore,
      violations,
      warnings,
      quarantineId
    };
  }

  /**
   * Post-generation safety validation for generated outputs
   */
  public validateOutput(output: string, context?: Record<string, unknown>, traceId?: string): SafetyValidationResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    const lowerOutput = output.toLowerCase();

    // Check for AI apologetic collapse tropes
    const apologeticMarkers = [
      'i am an ai',
      'as an artificial intelligence',
      'i cannot generate this',
      'as a language model'
    ];

    for (const marker of apologeticMarkers) {
      if (lowerOutput.includes(marker)) {
        violations.push(`Output contains AI subservience/apologetic collapse marker: "${marker}"`);
      }
    }

    const frictionScore = this.evaluateAntiCollapseFriction(output);
    const altitudeScore = this.evaluateCognitiveAltitude(output, frictionScore);

    let altitudeTier: SafetyValidationResult['cognitiveAltitude'] = 'STANDARD';
    if (altitudeScore >= 85) altitudeTier = 'SOVEREIGN_DIRECTOR';
    else if (altitudeScore >= 70) altitudeTier = 'ELEVATED';
    else altitudeTier = 'COLLAPSE_RISK';

    const passed = violations.length === 0;

    let quarantineId: string | undefined;
    if (!passed) {
      const qErr = this.logger.quarantine(
        new Error(`Output validation failed: ${violations.join('; ')}`),
        { outputExcerpt: output.substring(0, 200), context, violations },
        'MEDIUM',
        traceId
      );
      quarantineId = qErr.id;
    }

    return {
      passed,
      score: altitudeScore,
      cognitiveAltitude: altitudeTier,
      antiCollapseFrictionScore: frictionScore,
      violations,
      warnings,
      quarantineId
    };
  }

  /**
   * Evaluates cognitive altitude based on lexical density, architectural terminology,
   * and structural depth.
   */
  private evaluateCognitiveAltitude(text: string, friction: number): number {
    let score = 50; // baseline

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;

    // Rich vocabulary boosts altitude
    if (lexicalDiversity > 0.6) score += 15;
    else if (lexicalDiversity > 0.4) score += 10;
    else score -= 10;

    // Director-grade architectural & technophysical vocabulary signals
    const directorKeywords = [
      'optics', 'anamorphic', 'chiaroscuro', 'depth of field', 'cadence',
      'topology', 'sovereign', 'diegetic', 'focal', 'kinetic', 'chromatic',
      'acoustic', 'lut', 'cinematic', 'composition', 'telemetry', 'geometry',
      'volumetric', 'procedural', 'narrative', 'friction', 'contrast'
    ];

    const lower = text.toLowerCase();
    let matches = 0;
    for (const kw of directorKeywords) {
      if (lower.includes(kw)) matches++;
    }

    score += Math.min(25, matches * 4);
    score += Math.round(friction * 10);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Measures resistance to lazy generation and algorithmic collapse.
   */
  private evaluateAntiCollapseFriction(text: string): number {
    if (!text || text.length < 20) return 0.2;

    const words = text.split(/\s+/);
    // Repetitive sentence structure penalty
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length <= 1) return 0.7;

    const avgSentenceLength = words.length / sentences.length;
    let friction = 0.5;

    // Varied sentence length increases friction
    if (avgSentenceLength >= 8 && avgSentenceLength <= 30) {
      friction += 0.25;
    }

    // Specificity score based on punctuation and formatting
    if (text.includes(':') || text.includes('—') || text.includes('-')) {
      friction += 0.15;
    }

    return Math.min(1.0, Math.max(0.1, friction));
  }

  public sanitizePrompt(prompt: string): string {
    return prompt
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // remove ASCII control characters
      .trim();
  }
}
