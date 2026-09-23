/**
 * CreativeOrchestrator - Multi-Module Routing, Task Dispatch & Dependency Resolution
 * Agent Role: Creative Orchestrator Specialist
 */

import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';
import { VisionCoreSafetyGuards } from '../safety/VisionCoreSafetyGuards.js';
import { StyleMemoryEngine, StyleFingerprint } from './StyleMemoryEngine.js';
import { Generator, CreativeIdea, CinematicScript, SceneSpecification } from '../modules/Generator.js';
import { RenderLoop, RenderExecutionTrace } from '../modules/RenderLoop.js';
import { CoreForge } from '../modules/CoreForge.js';
import { PulseEngine, PulseAnalysis, PulseForecast, PulseDiagnostic } from '../modules/PulseEngine.js';
import { InnovationGenerator, MutatedConcept, CreativeExpansionTimeline } from '../modules/InnovationGenerator.js';

export interface OrchestrationRequest {
  prompt: string;
  targetStyle?: string;
  enableRender?: boolean;
  enableInnovation?: boolean;
  enableForecasting?: boolean;
  resolutionWidth?: number;
  resolutionHeight?: number;
  traceId?: string;
}

export interface ModuleExecutionSummary {
  module: 'Generator' | 'RenderLoop' | 'CoreForge' | 'PulseEngine' | 'InnovationGenerator';
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  durationMs: number;
  details: string;
}

export interface OrchestrationResult {
  traceId: string;
  prompt: string;
  style: StyleFingerprint;
  idea: CreativeIdea;
  script: CinematicScript;
  scene: SceneSpecification;
  pulseAnalysis?: PulseAnalysis;
  pulseForecast?: PulseForecast;
  pulseDiagnostic?: PulseDiagnostic;
  mutatedConcept?: MutatedConcept;
  expansionTimeline?: CreativeExpansionTimeline;
  renderTrace?: RenderExecutionTrace;
  memoryRecordIds: string[];
  moduleExecutionPath: ModuleExecutionSummary[];
  totalDurationMs: number;
}

export class CreativeOrchestrator {
  private logger: VisionCoreLogger;
  public generator: Generator;
  public renderLoop: RenderLoop;
  public coreForge: CoreForge;
  public pulseEngine: PulseEngine;
  public innovationGenerator: InnovationGenerator;
  public styleMemory: StyleMemoryEngine;
  public safetyGuards: VisionCoreSafetyGuards;

  constructor(
    deps?: {
      generator?: Generator;
      renderLoop?: RenderLoop;
      coreForge?: CoreForge;
      pulseEngine?: PulseEngine;
      innovationGenerator?: InnovationGenerator;
      styleMemory?: StyleMemoryEngine;
      safetyGuards?: VisionCoreSafetyGuards;
    }
  ) {
    this.logger = new VisionCoreLogger('CreativeOrchestrator');
    this.generator = deps?.generator || new Generator();
    this.renderLoop = deps?.renderLoop || new RenderLoop();
    this.coreForge = deps?.coreForge || new CoreForge();
    this.pulseEngine = deps?.pulseEngine || new PulseEngine();
    this.innovationGenerator = deps?.innovationGenerator || new InnovationGenerator();
    this.styleMemory = deps?.styleMemory || new StyleMemoryEngine();
    this.safetyGuards = deps?.safetyGuards || new VisionCoreSafetyGuards();
  }

  /**
   * Orchestrates full end-to-end creative workflow across all specialized modules.
   */
  public async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const traceId = request.traceId || `vc-orch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    this.logger.info(`Starting orchestration pipeline for trace: ${traceId}`, { prompt: request.prompt });

    // 1. Safety & Guardrail Validation
    const validation = this.safetyGuards.validateDirective(request.prompt, traceId);
    if (!validation.valid && validation.quarantineTriggered) {
      throw new Error(`Orchestration aborted due to safety guardrail violation: ${validation.violations.join('; ')}`);
    }

    const effectivePrompt = validation.sanitizedInput || request.prompt;
    const moduleExecutionPath: ModuleExecutionSummary[] = [];
    const memoryRecordIds: string[] = [];

    // 2. Style Memory Retrieval
    const style = this.styleMemory.getStyleFingerprint(request.targetStyle || 'Imperial Gold');
    const toneCheck = this.styleMemory.enforceToneConsistency(style, effectivePrompt);
    if (!toneCheck.isConsistent) {
      this.logger.warn(`Style tone inconsistency detected; applying corrective directives: ${toneCheck.correctiveDirectives.join(', ')}`, undefined, traceId);
    }

    // 3. Module Routing: Generator
    const genStart = Date.now();
    const idea = this.generator.generateIdea(effectivePrompt, style);
    const script = this.generator.generateScript(idea, style);
    const scene = this.generator.generateScene(1, effectivePrompt, style);
    moduleExecutionPath.push({
      module: 'Generator',
      status: 'SUCCESS',
      durationMs: Date.now() - genStart,
      details: `Generated idea ${idea.id}, script "${script.title}", and scene ${scene.sceneId}`
    });

    // 4. Module Routing: CoreForge Memory Persistence
    const forgeStart = Date.now();
    const fingerprintRecord = this.coreForge.saveCreativeFingerprint(`fp-${idea.id}`, {
      title: script.title,
      authorTier: 'Tier-2 Director Subsystem',
      aestheticSignature: style.name,
      colorPalette: style.colorPalette,
      lightingProfile: style.lighting.lutName,
      opticsProfile: `${style.optics.focalLengthMm}mm ${style.optics.lensType}`,
      spatialTopology: scene.environment.biome
    }, ['orchestrated', style.aestheticCategory]);

    const arcRecord = this.coreForge.saveNarrativeArc(`arc-${idea.id}`, {
      title: script.title,
      actStructure: [
        { act: 1, beat: 'Lattice Revelation', tensionLevel: 45 },
        { act: 2, beat: 'Niagara Convergence', tensionLevel: 75 },
        { act: 3, beat: 'Sovereign Manifestation', tensionLevel: 95 }
      ],
      pacingCadence: 'Deliberate',
      resolutionType: 'Monolithic Affirmation'
    }, ['narrative', '3-act']);

    memoryRecordIds.push(fingerprintRecord.metadata.id, arcRecord.metadata.id);
    moduleExecutionPath.push({
      module: 'CoreForge',
      status: 'SUCCESS',
      durationMs: Date.now() - forgeStart,
      details: `Persisted records ${fingerprintRecord.metadata.id} and ${arcRecord.metadata.id} (versioned & idempotent)`
    });

    // 5. Module Routing: PulseEngine Analysis & Diagnostics
    let pulseAnalysis: PulseAnalysis | undefined;
    let pulseForecast: PulseForecast | undefined;
    let pulseDiagnostic: PulseDiagnostic | undefined;

    if (request.enableForecasting !== false) {
      const pulseStart = Date.now();
      pulseAnalysis = this.pulseEngine.analyze(script, style);
      pulseForecast = this.pulseEngine.forecast(pulseAnalysis, style);
      pulseDiagnostic = this.pulseEngine.diagnose(pulseAnalysis, script);
      moduleExecutionPath.push({
        module: 'PulseEngine',
        status: 'SUCCESS',
        durationMs: Date.now() - pulseStart,
        details: `Tension curve points: ${pulseAnalysis.tensionCurve.length}, Virality vector: ${pulseForecast.viralityVector}, Health: ${pulseDiagnostic.healthy}`
      });
    } else {
      moduleExecutionPath.push({
        module: 'PulseEngine',
        status: 'SKIPPED',
        durationMs: 0,
        details: 'Pulse analysis skipped by request configuration'
      });
    }

    // 6. Module Routing: InnovationGenerator
    let mutatedConcept: MutatedConcept | undefined;
    let expansionTimeline: CreativeExpansionTimeline | undefined;

    if (request.enableInnovation !== false) {
      const innovStart = Date.now();
      mutatedConcept = this.innovationGenerator.mutate(idea, 0.35);
      expansionTimeline = this.innovationGenerator.expandCreativeUniverse(idea);
      moduleExecutionPath.push({
        module: 'InnovationGenerator',
        status: 'SUCCESS',
        durationMs: Date.now() - innovStart,
        details: `Mutated concept ${mutatedConcept.mutatedId} and branched ${expansionTimeline.alternativeRealities.length} parallel timelines`
      });
    } else {
      moduleExecutionPath.push({
        module: 'InnovationGenerator',
        status: 'SKIPPED',
        durationMs: 0,
        details: 'Innovation generator skipped by request configuration'
      });
    }

    // 7. Module Routing: RenderLoop
    let renderTrace: RenderExecutionTrace | undefined;
    if (request.enableRender !== false) {
      const renderStart = Date.now();
      renderTrace = await this.renderLoop.executeRenderSequence({
        scene,
        style,
        resolutionWidth: request.resolutionWidth || 3840,
        resolutionHeight: request.resolutionHeight || 2160,
        fps: 24
      });
      moduleExecutionPath.push({
        module: 'RenderLoop',
        status: 'SUCCESS',
        durationMs: Date.now() - renderStart,
        details: `Executed 5-stage render loop for job ${renderTrace.jobId} resulting in ${renderTrace.compositeArtifact.format}`
      });
    } else {
      moduleExecutionPath.push({
        module: 'RenderLoop',
        status: 'SKIPPED',
        durationMs: 0,
        details: 'Render execution skipped by request configuration'
      });
    }

    const totalDurationMs = Date.now() - startTime;
    this.logger.info(`Orchestration completed successfully in ${totalDurationMs}ms [Trace: ${traceId}]`);

    return {
      traceId,
      prompt: effectivePrompt,
      style,
      idea,
      script,
      scene,
      pulseAnalysis,
      pulseForecast,
      pulseDiagnostic,
      mutatedConcept,
      expansionTimeline,
      renderTrace,
      memoryRecordIds,
      moduleExecutionPath,
      totalDurationMs
    };
  }
}
