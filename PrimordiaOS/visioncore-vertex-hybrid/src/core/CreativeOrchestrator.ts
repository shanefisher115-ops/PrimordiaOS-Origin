/**
 * CreativeOrchestrator - Master Task Dispatcher & Subsystem Coordinator
 * Agent Role: Creative Orchestrator Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger } from '../logging/HybridLogger.js';
import { HybridSafetyLayer } from '../safety/HybridSafetyLayer.js';
import { VertexAIPipelineRouter, VertexNormalizedResponse } from '../vertex/VertexAIPipelineRouter.js';
import { CoreForge, StoredCreativeFingerprint } from '../modules/CoreForge.js';
import { Generator, GeneratedIdea, GeneratedScript, GeneratedScene } from '../modules/Generator.js';
import { RenderLoop, RenderLoopResult, RenderDirective } from '../modules/RenderLoop.js';
import { PulseEngine, CreativeDiagnostics, TrendForecast } from '../modules/PulseEngine.js';
import { InnovationGenerator, RecombinedStyleResult } from '../modules/InnovationGenerator.js';
import { VisionCoreEngine, VisionCoreOutput } from './VisionCoreEngine.js';

export interface OrchestrationTaskRequest {
  directive: string;
  generateScript?: boolean;
  generateSceneVisuals?: boolean;
  runPulseDiagnostics?: boolean;
  exploreInnovationMutations?: boolean;
  context?: Record<string, unknown>;
  traceId?: string;
}

export interface OrchestrationTaskResult {
  orchestrationId: string;
  directive: string;
  visionCoreOutput: VisionCoreOutput;
  idea?: GeneratedIdea;
  script?: GeneratedScript;
  scene?: GeneratedScene;
  renderResult?: RenderLoopResult;
  diagnostics?: CreativeDiagnostics;
  innovation?: {
    mutatedFingerprint?: StoredCreativeFingerprint;
    recombinedStyle?: RecombinedStyleResult;
  };
  totalDurationMs: number;
  traceId: string;
}

export class CreativeOrchestrator {
  private logger: HybridLogger;
  private safety: HybridSafetyLayer;
  private router: VertexAIPipelineRouter;
  private memory: CoreForge;
  private visionCore: VisionCoreEngine;
  private generator: Generator;
  private renderLoop: RenderLoop;
  private pulseEngine: PulseEngine;
  private innovation: InnovationGenerator;

  constructor(
    memory?: CoreForge,
    router?: VertexAIPipelineRouter,
    safety?: HybridSafetyLayer
  ) {
    this.logger = new HybridLogger('CreativeOrchestrator');
    this.memory = memory || new CoreForge();
    this.router = router || new VertexAIPipelineRouter();
    this.safety = safety || new HybridSafetyLayer();

    this.visionCore = new VisionCoreEngine(this.memory, this.safety);
    this.generator = new Generator(this.router, this.memory);
    this.renderLoop = new RenderLoop(this.router, this.memory);
    this.pulseEngine = new PulseEngine(this.router, this.memory);
    this.innovation = new InnovationGenerator(this.router, this.memory);
  }

  // Subsystem Accessors
  public getMemory(): CoreForge { return this.memory; }
  public getRouter(): VertexAIPipelineRouter { return this.router; }
  public getSafety(): HybridSafetyLayer { return this.safety; }
  public getVisionCore(): VisionCoreEngine { return this.visionCore; }
  public getGenerator(): Generator { return this.generator; }
  public getRenderLoop(): RenderLoop { return this.renderLoop; }
  public getPulseEngine(): PulseEngine { return this.pulseEngine; }
  public getInnovationGenerator(): InnovationGenerator { return this.innovation; }

  /**
   * Dispatches and coordinates a comprehensive creative orchestration cycle
   */
  public async orchestrate(req: OrchestrationTaskRequest): Promise<OrchestrationTaskResult> {
    const startTime = Date.now();
    const orchestrationId = `orch-${Date.now().toString(36)}`;
    const traceId = req.traceId || `trace-${orchestrationId}`;

    this.logger.info(`Initiating Creative Orchestration [${orchestrationId}] for directive: "${req.directive.substring(0, 60)}"`, undefined, traceId);

    // Step 1: Director Intelligence via VisionCoreEngine
    const visionCoreOutput = await this.visionCore.evaluate(req.directive, req.context, traceId);

    let idea: GeneratedIdea | undefined;
    let script: GeneratedScript | undefined;
    let scene: GeneratedScene | undefined;
    let renderResult: RenderLoopResult | undefined;
    let diagnostics: CreativeDiagnostics | undefined;
    let innovationResult: OrchestrationTaskResult['innovation'];

    // Step 2: Ideation & Generation
    idea = await this.generator.generateIdea(req.directive, 'SOVEREIGN_DIRECTOR', traceId);

    if (req.generateScript !== false) {
      script = await this.generator.generateScript(idea.premise, 2, traceId);
    }

    if (req.generateSceneVisuals !== false) {
      scene = await this.generator.generateScene(req.directive, 3, traceId);
    }

    // Step 3: RenderLoop Execution
    if (scene) {
      const renderDirectives: RenderDirective[] = [
        {
          id: `rd-1-${Date.now().toString(36)}`,
          action: 'RENDER_STILL',
          prompt: scene.visualPromptForGemini,
          priority: 10
        },
        {
          id: `rd-2-${Date.now().toString(36)}`,
          action: 'RENDER_SEQUENCE',
          prompt: `Temporal movement for scene: ${scene.title}. Motion: ${scene.shots[0]?.cameraMovement}`,
          priority: 5
        }
      ];

      renderResult = await this.renderLoop.executeDirectives(renderDirectives, traceId);
    }

    // Step 4: Creative Diagnostics via PulseEngine
    if (req.runPulseDiagnostics !== false) {
      const textToAnalyze = `${req.directive}\n${idea.premise}\n${script?.logline || ''}`;
      diagnostics = await this.pulseEngine.analyzeDiagnostics(textToAnalyze, traceId);
    }

    // Step 5: Innovation & Mutation Exploration
    if (req.exploreInnovationMutations) {
      const mutated = this.innovation.mutateStyle({
        mutationRate: 0.65,
        focalShift: 'LIGHTING'
      }, traceId);

      const recombined = this.innovation.recombineStyles(undefined, undefined, traceId);

      innovationResult = {
        mutatedFingerprint: mutated,
        recombinedStyle: recombined
      };
    }

    const totalDuration = Date.now() - startTime;
    this.logger.info(`Creative Orchestration [${orchestrationId}] completed in ${totalDuration}ms`, undefined, traceId);

    return {
      orchestrationId,
      directive: req.directive,
      visionCoreOutput,
      idea,
      script,
      scene,
      renderResult,
      diagnostics,
      innovation: innovationResult,
      totalDurationMs: totalDuration,
      traceId
    };
  }
}
