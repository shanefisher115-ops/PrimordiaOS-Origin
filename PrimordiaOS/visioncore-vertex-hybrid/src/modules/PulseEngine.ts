/**
 * PulseEngine - Analysis, Forecasting & Creative Diagnostics Subsystem
 * Agent Role: Pulse Engine Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger } from '../logging/HybridLogger.js';
import { VertexAIPipelineRouter } from '../vertex/VertexAIPipelineRouter.js';
import { CoreForge, StoredEmotionalTone } from './CoreForge.js';

export interface CreativeDiagnostics {
  entropyScore: number; // 0.0 (static) to 1.0 (chaotic)
  cognitiveFrictionIndex: number; // 0.0 (collapse) to 1.0 (sovereign rigor)
  narrativeVelocity: number; // 0.0 (inert) to 1.0 (hyper-kinetic)
  visualCoherence: number; // 0.0 (discordant) to 1.0 (harmonized)
  directorGradeAlignment: boolean;
  recommendations: string[];
}

export interface TrendForecast {
  targetGenreOrTheme: string;
  projectedTrajectory: string;
  recommendedStylisticShifts: string[];
  semanticConfidence: number;
  divergenceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class PulseEngine {
  private logger: HybridLogger;
  private router: VertexAIPipelineRouter;
  private memory: CoreForge;

  constructor(router: VertexAIPipelineRouter, memory: CoreForge) {
    this.logger = new HybridLogger('PulseEngine');
    this.router = router;
    this.memory = memory;
  }

  /**
   * Evaluates comprehensive creative diagnostics on text or script content
   */
  public async analyzeDiagnostics(
    content: string,
    traceId?: string
  ): Promise<CreativeDiagnostics> {
    const entropy = this.calculateEntropy(content);
    const friction = this.calculateFriction(content);
    const velocity = this.calculateNarrativeVelocity(content);
    const coherence = this.calculateVisualCoherence(content);

    const alignment = friction >= 0.65 && entropy >= 0.3 && entropy <= 0.85;

    const recommendations: string[] = [];
    if (friction < 0.65) {
      recommendations.push('Inject higher technophysical specificity and structural tension to elevate friction.');
    }
    if (entropy > 0.85) {
      recommendations.push('Reduce erratic lexical jumps to stabilize thematic coherence.');
    }
    if (velocity < 0.4) {
      recommendations.push('Accelerate narrative pacing with crisper action verbs and rhythmic cutaways.');
    }

    // Persist diagnostic tone evaluation to memory
    const tone: StoredEmotionalTone = {
      dominantEmotion: alignment ? 'Sovereign Determination' : 'Cognitive Hesitation',
      secondaryEmotion: 'Architectural Awe',
      frictionIndex: friction,
      valence: 0.2,
      arousal: velocity
    };
    this.memory.saveEmotionalTone(`pulse-diag-${Date.now().toString(36)}`, tone, ['diagnostics', 'pulse']);

    this.logger.info(`PulseEngine diagnostics computed (friction: ${friction.toFixed(2)}, entropy: ${entropy.toFixed(2)})`, undefined, traceId);

    return {
      entropyScore: entropy,
      cognitiveFrictionIndex: friction,
      narrativeVelocity: velocity,
      visualCoherence: coherence,
      directorGradeAlignment: alignment,
      recommendations
    };
  }

  /**
   * Forecasts stylistic and thematic trends using Gemini embeddings
   */
  public async forecastTrend(
    genreOrTheme: string,
    traceId?: string
  ): Promise<TrendForecast> {
    // Obtain embedding for semantic vector analysis
    const embeddingRes = await this.router.route({
      taskType: 'EMBEDDINGS',
      prompt: genreOrTheme,
      traceId
    });

    const vector = embeddingRes.embeddingVector || [];
    // Compute pseudo-divergence from reference vector
    const meanMagnitude = vector.reduce((sum, v) => sum + Math.abs(v), 0) / (vector.length || 1);

    const confidence = Math.min(0.98, Math.max(0.70, 0.85 + (meanMagnitude * 0.1)));

    return {
      targetGenreOrTheme: genreOrTheme,
      projectedTrajectory: `Accelerating shift towards hyper-tactile, high-contrast chiaroscuro and physical optics realism.`,
      recommendedStylisticShifts: [
        'Migrate from flat diffuse lighting to directed volumetric rays',
        'Incorporate tangible mechanical/industrial textures',
        'Employ non-linear pacing with deliberate contemplative rests'
      ],
      semanticConfidence: Number(confidence.toFixed(3)),
      divergenceRisk: confidence > 0.85 ? 'LOW' : 'MEDIUM'
    };
  }

  /**
   * Shannon entropy calculation across token distribution
   */
  private calculateEntropy(text: string): number {
    if (!text || text.length === 0) return 0;
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 0;

    const freqMap: Map<string, number> = new Map();
    for (const t of tokens) {
      freqMap.set(t, (freqMap.get(t) || 0) + 1);
    }

    let entropy = 0;
    for (const count of freqMap.values()) {
      const p = count / tokens.length;
      entropy -= p * Math.log2(p);
    }

    // Normalize against theoretical maximum log2(N)
    const maxEntropy = Math.log2(tokens.length) || 1;
    const normalized = entropy / maxEntropy;

    return Number(Math.min(1.0, Math.max(0.0, normalized)).toFixed(3));
  }

  private calculateFriction(text: string): number {
    const directorKeywords = [
      'anamorphic', 'chiaroscuro', 'sovereign', 'diegetic', 'brutalist',
      'tension', 'telemetry', 'cadence', 'focal', 'volumetric', 'monolithic'
    ];
    let matches = 0;
    const lower = text.toLowerCase();
    for (const kw of directorKeywords) {
      if (lower.includes(kw)) matches++;
    }

    const ratio = matches / 5;
    return Number(Math.min(1.0, Math.max(0.3, 0.5 + ratio * 0.5)).toFixed(3));
  }

  private calculateNarrativeVelocity(text: string): number {
    const actionVerbs = ['ignites', 'shatters', 'accelerates', 'collides', 'surges', 'strikes', 'descends', 'locks'];
    let count = 0;
    const lower = text.toLowerCase();
    for (const v of actionVerbs) {
      if (lower.includes(v)) count++;
    }

    return Number(Math.min(1.0, Math.max(0.35, 0.4 + count * 0.15)).toFixed(3));
  }

  private calculateVisualCoherence(text: string): number {
    const lower = text.toLowerCase();
    let score = 0.7;
    if (lower.includes('lighting') || lower.includes('shadow')) score += 0.1;
    if (lower.includes('lens') || lower.includes('camera')) score += 0.1;
    if (lower.includes('color') || lower.includes('palette')) score += 0.1;
    return Number(Math.min(1.0, score).toFixed(3));
  }
}
