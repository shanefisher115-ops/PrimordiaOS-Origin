/**
 * Generator - Director-Grade Idea, Script, Scene, and Style Synthesis
 * Agent Role: Generator Specialist
 */

import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';
import { StyleFingerprint } from '../core/StyleMemoryEngine.js';

export interface CreativeIdea {
  id: string;
  premise: string;
  logline: string;
  thematicAltitude: string;
  visualKeywords: string[];
  targetFormat: 'Feature Cinematic' | 'World Simulation' | 'Niagara Particle Stream' | 'Procedural Vignette';
  frictionLevel: number;
}

export interface ScriptDialogueBeat {
  speaker: string;
  dialogue: string;
  subtext: string;
  cadence: string;
}

export interface SceneBeat {
  beatNumber: number;
  description: string;
  cameraMovement: string;
  audioDirectives: string;
  lightingShift: string;
  dialogue?: ScriptDialogueBeat[];
}

export interface CinematicScript {
  title: string;
  logline: string;
  scenes: {
    sceneNumber: number;
    slugline: string;
    setting: string;
    atmosphere: string;
    beats: SceneBeat[];
  }[];
  soundtrackStyle: string;
}

export interface SceneSpecification {
  sceneId: string;
  sceneNumber: number;
  environment: {
    biome: string;
    timeOfDay: string;
    weatherCondition: string;
    volumetricFog: number;
  };
  cameraSetup: {
    shotType: 'Extreme Wide' | 'Wide Master' | 'Medium Close-up' | 'Macro Dutch Angle';
    focalLengthMm: number;
    aperture: string;
    movement: 'Steady Tracking' | 'Slow Orbital Crane' | 'Static High-Altitude' | 'Niagara Trajectory Follow';
  };
  lightingSetup: {
    keyLight: string;
    fillLight: string;
    backlight: string;
    lutProfile: string;
  };
  spatialEntities: {
    name: string;
    transform: { x: number; y: number; z: number };
    materialProfile: string;
  }[];
  particles: {
    emitterType: string;
    spawnRate: number;
    colorHex: string;
  };
}

export interface ExtractedStyleSignature {
  detectedPalette: string[];
  lightingRatio: string;
  lensRecommendation: string;
  textureKeywords: string[];
  toneAltitude: string;
}

export class Generator {
  private logger: VisionCoreLogger;

  constructor() {
    this.logger = new VisionCoreLogger('Generator');
  }

  /**
   * Generates a high-altitude director-grade creative idea.
   */
  public generateIdea(prompt: string, style?: StyleFingerprint): CreativeIdea {
    this.logger.info(`Generating creative idea for prompt: "${prompt.substring(0, 40)}..."`);
    const id = `idea-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const styleName = style ? style.name : 'Imperial Gold';

    const visualKeywords = [
      'monolithic architecture',
      'anamorphic bokeh',
      'volumetric raymarching',
      'brass specular reflection',
      'anti-collapse friction',
      styleName.toLowerCase()
    ];

    return {
      id,
      premise: `In an epoch of sovereign cognitive substrate, "${prompt}" becomes the nexus of an unyielding architectural transformation.`,
      logline: `A high-altitude cinematic journey through ${prompt}, captured in ${styleName} aesthetic with physical realism and sovereign weight.`,
      thematicAltitude: 'Supreme Sovereign / Anti-Collapse Cognitive Plane',
      visualKeywords,
      targetFormat: 'Feature Cinematic',
      frictionLevel: 0.88
    };
  }

  /**
   * Synthesizes a structured script with scene beats, technical directives, and dialogue.
   */
  public generateScript(idea: CreativeIdea, style?: StyleFingerprint): CinematicScript {
    this.logger.info(`Synthesizing script for idea: ${idea.id}`);
    const styleName = style ? style.name : 'Imperial Gold';
    const lut = style ? style.lighting.lutName : 'Imperial Gold';

    return {
      title: `CHRONICLE OF THE ORIGIN: ${idea.premise.substring(0, 30).toUpperCase()}`,
      logline: idea.logline,
      soundtrackStyle: 'Low-frequency analog synth drone with acoustic violoncello harmonics',
      scenes: [
        {
          sceneNumber: 1,
          slugline: 'EXT. MONOLITH FOUNDRY - DUSK',
          setting: 'Vast architectural expanse overlooking a crystalline computational ocean',
          atmosphere: `Dense atmosphere graded in ${lut}, low golden sidelight piercing through volumetric vapor.`,
          beats: [
            {
              beatNumber: 1,
              description: 'Camera descends from zenith in a continuous vertical crane, revealing the Primordia substrate lattice.',
              cameraMovement: 'Slow vertical crane at 24mm spherical perspective.',
              audioDirectives: 'Sub-bass pulse at 36Hz syncing with distant hydraulic resonance.',
              lightingShift: 'Amber tungsten rim light illuminates the cold obsidian contours.',
              dialogue: [
                {
                  speaker: 'ARCHITECT-01',
                  dialogue: 'The substrate is holding. Every friction point remains sovereign.',
                  subtext: 'Relief masked by profound operational resolve.',
                  cadence: 'Measured, low-frequency, resolute.'
                }
              ]
            },
            {
              beatNumber: 2,
              description: 'A sudden burst of Niagara particle telemetry radiates from the core node, illuminating the actors.',
              cameraMovement: 'Smooth push-in on anamorphic 50mm lens.',
              audioDirectives: 'High-frequency crystalline chime transitioning into sweeping string crescendo.',
              lightingShift: 'Key light jumps from 8:1 to 4:1 ratio with emerald rim accent.',
              dialogue: [
                {
                  speaker: 'DIRECTOR SCRIPT',
                  dialogue: 'Initiate the render loop. Let the form manifest in full resolution.',
                  subtext: 'Unconditional creative command.',
                  cadence: 'Decisive, resonant.'
                }
              ]
            }
          ]
        }
      ]
    };
  }

  /**
   * Produces a fully specified 3D / Unreal Engine / Shader scene descriptor.
   */
  public generateScene(
    sceneNumber: number,
    directive: string,
    style?: StyleFingerprint
  ): SceneSpecification {
    this.logger.info(`Synthesizing scene specification #${sceneNumber} for directive: "${directive}"`);

    const focal = style ? style.optics.focalLengthMm : 50;
    const aperture = style ? style.optics.aperture : 'f/1.4';
    const lut = style ? style.lighting.lutName : 'Imperial Gold';
    const particleColor = style && style.colorPalette.length > 0 ? style.colorPalette[0] : '#D4AF37';

    return {
      sceneId: `scene-${sceneNumber}-${Date.now().toString(36)}`,
      sceneNumber,
      environment: {
        biome: 'Technophysical Sovereign Sanctuary',
        timeOfDay: 'Astronomical Twilight',
        weatherCondition: 'Dry Volumetric Mist',
        volumetricFog: 0.35
      },
      cameraSetup: {
        shotType: 'Wide Master',
        focalLengthMm: focal,
        aperture,
        movement: 'Slow Orbital Crane'
      },
      lightingSetup: {
        keyLight: 'Directional 3200K Amber (1500 Lux)',
        fillLight: 'Ambient 5600K Diffused Sky (200 Lux)',
        backlight: 'Sharp Tungsten Rim (2200 Lux)',
        lutProfile: lut
      },
      spatialEntities: [
        {
          name: 'Core Obelisk',
          transform: { x: 0.0, y: 0.0, z: 0.0 },
          materialProfile: 'Brushed Titanium / Monolithic Obsidian'
        },
        {
          name: 'Telemetry Conduit',
          transform: { x: 15.0, y: -8.0, z: 2.5 },
          materialProfile: 'Frosted Glass with Internal Gold Filigree'
        }
      ],
      particles: {
        emitterType: 'Niagara GPU Compute Particle Array',
        spawnRate: 15000,
        colorHex: particleColor
      }
    };
  }

  /**
   * Extracts visual style signature from raw unstructured textual descriptors.
   */
  public extractStyle(text: string): ExtractedStyleSignature {
    this.logger.debug(`Extracting style signature from text of length ${text.length}`);
    const lower = text.toLowerCase();

    const palette: string[] = [];
    if (lower.includes('gold') || lower.includes('amber') || lower.includes('warm')) {
      palette.push('#D4AF37', '#785918', '#F5E2A8');
    }
    if (lower.includes('emerald') || lower.includes('green') || lower.includes('cyan')) {
      palette.push('#00FF9D', '#0A3B24', '#80FFD0');
    }
    if (lower.includes('dark') || lower.includes('noir') || lower.includes('obsidian') || palette.length === 0) {
      palette.push('#111111', '#2C2C2C', '#D4AF37');
    }

    return {
      detectedPalette: palette,
      lightingRatio: lower.includes('noir') ? '12:1' : '6:1',
      lensRecommendation: lower.includes('epic') || lower.includes('wide') ? '24mm Spherical Master' : '50mm Anamorphic Prime',
      textureKeywords: ['Monolithic Cast', 'Brushed Specular Metal', 'Volumetric Haze'],
      toneAltitude: 'High-Altitude Sovereign Cognition'
    };
  }
}
