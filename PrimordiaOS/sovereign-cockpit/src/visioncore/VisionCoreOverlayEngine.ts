/**
 * PrimordiaOS Sovereign Cockpit — VisionCore Overlay Engine
 * Generates cosmic celestial overlays, particle constellations,
 * audio-reactive HUD waves, and sovereign perception glyphs.
 */

import { logger } from '../logging/CockpitLogger.js';
import { VisionCorePayload, Vector3D } from '../telemetry/TelemetryTypes.js';
import { CosmicField, CosmicParticle } from './CosmicField.js';

export interface ConstellationLine {
  from: Vector3D;
  to: Vector3D;
  opacity: number;
}

export interface OverlayFrame {
  particles: CosmicParticle[];
  constellations: ConstellationLine[];
  audioPulse: {
    bassLevel: number;
    midLevel: number;
    trebleLevel: number;
  };
  sovereignGlyph: {
    symbol: string;
    rotationAngle: number;
    scale: number;
  };
  timestamp: number;
}

export class VisionCoreOverlayEngine {
  private cosmicField: CosmicField;
  private visionEndpoint: string;
  private currentAudio: { bassLevel: number; midLevel: number; trebleLevel: number } = {
    bassLevel: 0.2,
    midLevel: 0.4,
    trebleLevel: 0.3
  };
  private glyphRotation: number = 0;
  private isLiveVisionConnected: boolean = false;

  constructor(visionUrl?: string) {
    this.visionEndpoint = visionUrl || process.env.VISIONCORE_URL || 'http://127.0.0.1:5055/vision';
    this.cosmicField = new CosmicField(250);
    logger.info('VisionCoreOverlayEngine', `Initialized VisionCore Overlay Engine pointing to: ${this.visionEndpoint}`);
  }

  /**
   * Updates attractor targets (e.g. holographic panel centers) for the cosmic field.
   */
  public setPanelAttractors(positions: Vector3D[]): void {
    this.cosmicField.setAttractors(positions);
  }

  /**
   * Ingests live VisionCore neural and audio frequency data.
   */
  public ingestVisionTelemetry(payload: VisionCorePayload): void {
    this.currentAudio = { ...payload.audioReactivity };
    this.isLiveVisionConnected = true;
  }

  /**
   * Advances simulation time and builds the complete overlay frame with constellation links.
   */
  public tick(deltaSeconds: number): OverlayFrame {
    // 1. Advance cosmic particles
    this.cosmicField.update(deltaSeconds, this.currentAudio);

    // 2. Rotate sovereign HUD glyph
    this.glyphRotation = (this.glyphRotation + deltaSeconds * 45) % 360;

    // 3. Compute dynamic constellation links between nearby particles
    const particles = this.cosmicField.getParticles();
    const constellations: ConstellationLine[] = [];
    const maxLinkDistSq = 70 * 70;

    for (let i = 0; i < Math.min(particles.length, 120); i++) {
      for (let j = i + 1; j < Math.min(particles.length, 120); j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.position.x - p2.position.x;
        const dy = p1.position.y - p2.position.y;
        const dz = p1.position.z - p2.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < maxLinkDistSq) {
          const dist = Math.sqrt(distSq);
          const opacity = (1.0 - dist / 70.0) * Math.min(p1.luminance, p2.luminance) * 0.7;
          if (opacity > 0.05) {
            constellations.push({
              from: { ...p1.position },
              to: { ...p2.position },
              opacity
            });
          }
        }
      }
    }

    return {
      particles: particles.slice(0, 150),
      constellations: constellations.slice(0, 80),
      audioPulse: { ...this.currentAudio },
      sovereignGlyph: {
        symbol: 'ᛟ', // Sovereign Othala rune / Primordia glyph
        rotationAngle: this.glyphRotation,
        scale: 1.0 + this.currentAudio.bassLevel * 0.35
      },
      timestamp: Date.now()
    };
  }

  public isConnected(): boolean {
    return this.isLiveVisionConnected;
  }
}
