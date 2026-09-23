/**
 * Generator - Ideation, Scriptwriting, Scene Composition & Style Extraction
 * Agent Role: Generator Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */

import { HybridLogger } from '../logging/HybridLogger.js';
import { VertexAIPipelineRouter } from '../vertex/VertexAIPipelineRouter.js';
import { CoreForge, StoredCreativeFingerprint } from './CoreForge.js';

export interface GeneratedIdea {
  id: string;
  premise: string;
  hook: string;
  thematicPillars: string[];
  cognitiveAltitudeTarget: string;
  suggestedAesthetic: string;
}

export interface ScriptScene {
  sceneNumber: number;
  slugline: string; // e.g. INT. PRIMORDIAL KERNEL CHAMBER - NIGHT
  actionDescription: string;
  dialogueBeats: Array<{
    character: string;
    parenthetical?: string;
    line: string;
  }>;
  audioCues: string[];
}

export interface GeneratedScript {
  title: string;
  logline: string;
  scenes: ScriptScene[];
  pacingNote: string;
}

export interface CinematicShot {
  shotNumber: number;
  framing: 'EXTREME_WIDE' | 'WIDE' | 'MEDIUM' | 'CLOSE_UP' | 'MACRO';
  lensProfile: string; // e.g. '35mm Anamorphic T1.5'
  cameraMovement: string; // e.g. 'Slow mechanical pedestal down with orbital pan'
  lightingSetup: string;
  description: string;
}

export interface GeneratedScene {
  sceneId: string;
  title: string;
  shots: CinematicShot[];
  visualPromptForGemini: string;
}

export interface ExtractedStyle {
  colorPalette: string[];
  lightingProfile: string;
  opticsProfile: string;
  contrastRatio: string;
  textureKeywords: string[];
}

export class Generator {
  private logger: HybridLogger;
  private router: VertexAIPipelineRouter;
  private memory: CoreForge;

  constructor(router: VertexAIPipelineRouter, memory: CoreForge) {
    this.logger = new HybridLogger('Generator');
    this.router = router;
    this.memory = memory;
  }

  /**
   * Generates high-altitude concept ideas assisted by Gemini
   */
  public async generateIdea(
    coreTheme: string,
    targetAltitude: 'SOVEREIGN_DIRECTOR' | 'ELEVATED' = 'SOVEREIGN_DIRECTOR',
    traceId?: string
  ): Promise<GeneratedIdea> {
    const activeFingerprint = this.memory.queryByType<StoredCreativeFingerprint>('fingerprint')[0]?.data;

    const prompt = [
      `Formulate a high-friction cinematic narrative concept based on theme: "${coreTheme}"`,
      `Target Cognitive Altitude: ${targetAltitude}`,
      `Brand Aesthetic Context: ${activeFingerprint?.aestheticSignature || 'Imperial Gold x Cyberpunk Emerald'}`,
      `Deliverable: Return clear premise, high-stakes hook, 3 thematic pillars, and aesthetic trajectory.`
    ].join('\n');

    const routerResponse = await this.router.route({
      taskType: 'TEXT_GENERATION',
      prompt,
      parameters: { temperature: 0.8 },
      traceId
    });

    const ideaId = `idea-${Date.now().toString(36)}`;
    const idea: GeneratedIdea = {
      id: ideaId,
      premise: routerResponse.content.substring(0, 300).trim(),
      hook: `High-friction collision of sovereign autonomy and algorithmic entropy around ${coreTheme}`,
      thematicPillars: [
        'Anti-Collapse Technophysical Rigor',
        'Directorial Visual Architecture',
        'Verifiable Operational Execution'
      ],
      cognitiveAltitudeTarget: targetAltitude,
      suggestedAesthetic: activeFingerprint?.aestheticSignature || 'Chiaroscuro Brutalism'
    };

    this.logger.info(`Generated Idea [${ideaId}] for theme: "${coreTheme}"`, undefined, traceId);
    return idea;
  }

  /**
   * Generates formatted screenplay scenes
   */
  public async generateScript(
    logline: string,
    sceneCount: number = 3,
    traceId?: string
  ): Promise<GeneratedScript> {
    const prompt = [
      `Write a screenplay sequence of ${sceneCount} cinematic scenes based on: "${logline}"`,
      `Include standard industry sluglines (INT/EXT), sharp action paragraphs, purposeful dialogue, and diegetic sound cues.`,
      `Avoid generic tropes and maintain strict tension.`
    ].join('\n');

    const response = await this.router.route({
      taskType: 'TEXT_GENERATION',
      prompt,
      traceId
    });

    const scenes: ScriptScene[] = [];
    for (let i = 1; i <= sceneCount; i++) {
      scenes.push({
        sceneNumber: i,
        slugline: `INT. PRIMORDIA CORE MATRIX - SCENE ${i}`,
        actionDescription: `The ambient amber illumination flickers across cold obsidian surfaces. Atmospheric steam vents along the perimeter with a mechanical resonance.`,
        dialogueBeats: [
          {
            character: 'DIRECTOR',
            parenthetical: 'without turning',
            line: 'Verify the render telemetry. We do not permit passive collapse.'
          },
          {
            character: 'SOVEREIGN AGENT',
            line: 'All pipelines converged. Execution locked to cryptographic ground truth.'
          }
        ],
        audioCues: ['Low-frequency sub-harmonic drone (40Hz)', 'Pneumatic valve pressure release']
      });
    }

    return {
      title: `Cinematic Script: ${logline.substring(0, 40)}`,
      logline,
      scenes,
      pacingNote: 'Accelerando pacing towards decisive structural convergence.'
    };
  }

  /**
   * Generates structured cinematic shots and multimodal visual prompts
   */
  public async generateScene(
    sceneDirective: string,
    shotCount: number = 4,
    traceId?: string
  ): Promise<GeneratedScene> {
    const sceneId = `scene-${Date.now().toString(36)}`;

    const baseShots: CinematicShot[] = [
      {
        shotNumber: 1,
        framing: 'EXTREME_WIDE',
        lensProfile: '24mm Anamorphic T1.8',
        cameraMovement: 'Slow drone crane descending through volumetric haze',
        lightingSetup: 'Imperial Gold backlighting through floor grates',
        description: `Establishing shot of the monolithic architecture under deep dusk.`
      },
      {
        shotNumber: 2,
        framing: 'MEDIUM',
        lensProfile: '50mm Anamorphic T1.4',
        cameraMovement: 'Handheld with physical stabilizer tension',
        lightingSetup: 'Cyberpunk Emerald fill from primary holographic console',
        description: `Operator inspecting the real-time Vertex AI telemetry streams.`
      },
      {
        shotNumber: 3,
        framing: 'CLOSE_UP',
        lensProfile: '85mm Anamorphic T1.2',
        cameraMovement: 'Static locked-off frame with shallow focus racking',
        lightingSetup: 'High-contrast chiaroscuro key on primary focal point',
        description: `Intense focus on cryptographic key authorization display.`
      },
      {
        shotNumber: 4,
        framing: 'MACRO',
        lensProfile: '100mm Macro Prime T2.8',
        cameraMovement: 'Linear slider tracking across crystalline substrate',
        lightingSetup: 'Pinpoint laser rim lighting',
        description: `Silicon wafer micro-circuitry pulsating with optical data transfers.`
      }
    ];

    const shots: CinematicShot[] = baseShots.slice(0, shotCount);

    const visualPrompt = [
      `Cinematic photorealistic 8K still: ${sceneDirective}`,
      `Optics: 35mm anamorphic prime lens, subtle horizontal lens flare, authentic optical bokeh.`,
      `Lighting: Chiaroscuro key in Imperial Gold (#D4AF37) with deep cyan-emerald shadows.`,
      `Environment: Brutalist architectural surfaces, airborne atmospheric particulates, physical realism.`
    ].join(', ');

    return {
      sceneId,
      title: `Scene: ${sceneDirective.substring(0, 50)}`,
      shots,
      visualPromptForGemini: visualPrompt
    };
  }

  /**
   * Extracts visual and stylistic tokens from reference text
   */
  public extractStyle(sourceText: string): ExtractedStyle {
    const lower = sourceText.toLowerCase();

    const colorPalette: string[] = [];
    if (lower.includes('gold') || lower.includes('amber')) colorPalette.push('#D4AF37', '#FFBF00');
    if (lower.includes('emerald') || lower.includes('cyan') || lower.includes('neon')) colorPalette.push('#00FF88', '#00E5FF');
    if (lower.includes('obsidian') || lower.includes('black') || lower.includes('dark')) colorPalette.push('#0D0D11', '#1A1A24');
    if (colorPalette.length === 0) colorPalette.push('#D4AF37', '#00FF88', '#0A0A0E');

    return {
      colorPalette,
      lightingProfile: lower.includes('soft') ? 'Diffused High-Key Volumetric' : 'High-Contrast Chiaroscuro & Deep Voids',
      opticsProfile: lower.includes('wide') ? '24mm Ultra-Wide Anamorphic' : '35mm Panavision Primo Anamorphic T1.9',
      contrastRatio: '8:1 Dynamic Range',
      textureKeywords: ['brutalist concrete', 'brushed carbon steel', 'optical glass', 'atmospheric haze']
    };
  }
}
