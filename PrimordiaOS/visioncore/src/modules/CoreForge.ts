/**
 * CoreForge - Versioned, Idempotent Creative Memory Subsystem
 * Agent Role: CoreForge Memory Specialist
 */

import { createHash } from 'node:crypto';
import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';

export interface MemoryMetadata {
  id: string;
  version: number;
  hash: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface StoredCreativeFingerprint {
  title: string;
  authorTier: string;
  aestheticSignature: string;
  colorPalette: string[];
  lightingProfile: string;
  opticsProfile: string;
  spatialTopology: string;
}

export interface StoredStylisticPattern {
  name: string;
  recurrenceFrequency: number;
  contrastRatio: string;
  textureKeywords: string[];
  dynamicRangeDb: number;
}

export interface StoredNarrativeArc {
  title: string;
  actStructure: { act: number; beat: string; tensionLevel: number }[];
  pacingCadence: 'Deliberate' | 'Accelerando' | 'Staccato' | 'Architectural Sieve';
  resolutionType: 'Monolithic Affirmation' | 'Open Sovereign Void' | 'Harmonic Equilibrium';
}

export interface StoredEmotionalTone {
  dominantEmotion: string;
  secondaryEmotion: string;
  frictionIndex: number; // 0.0 to 1.0 (anti-collapse friction)
  valence: number; // -1.0 to 1.0
  arousal: number; // 0.0 to 1.0
}

export interface StoredBrandIdentity {
  brandName: string;
  corePillars: string[];
  visualIdentityRules: string[];
  sovereigntyKernelVersion: string;
  forbiddenTropes: string[];
}

export interface StoredEvolutionNote {
  cycle: number;
  triggerEvent: string;
  modifications: string[];
  adaptationVector: string;
  reviewedByTier: number;
}

export interface CoreForgeRecord<T> {
  metadata: MemoryMetadata;
  data: T;
  type: 'fingerprint' | 'pattern' | 'arc' | 'tone' | 'brand' | 'evolution';
}

export class CoreForge {
  private logger: VisionCoreLogger;
  // Key: id -> versions array
  private records: Map<string, CoreForgeRecord<unknown>[]> = new Map();
  // Hash lookup for idempotency: hash -> id
  private hashIndex: Map<string, string> = new Map();

  constructor() {
    this.logger = new VisionCoreLogger('CoreForge');
    this.initializeDefaultBrandIdentity();
  }

  private calculateHash(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private initializeDefaultBrandIdentity(): void {
    this.saveBrandIdentity('primordia-brand', {
      brandName: 'PrimordiaOS Sovereign System',
      corePillars: [
        'Director-Grade High Altitude Cognition',
        'Anti-Collapse High Friction Creativity',
        'Technophysical & Cinematic Rigor',
        'Verifiable Operational Execution'
      ],
      visualIdentityRules: [
        'Prefer Imperial Gold & Cyberpunk Emerald color spaces',
        'Use physical anamorphic optics with real depth of field',
        'Maintain architectural weight and concrete/metallic textures'
      ],
      sovereigntyKernelVersion: 'v4.1.0',
      forbiddenTropes: [
        'Low-friction passive cartoon tropes',
        'Generic corporate vector minimalism',
        'Uncalibrated fluorescent noise'
      ]
    }, ['system', 'foundational']);
  }

  private storeRecord<T>(
    id: string,
    type: CoreForgeRecord<T>['type'],
    data: T,
    tags: string[] = []
  ): CoreForgeRecord<T> {
    const hash = this.calculateHash({ type, data });
    const existingId = this.hashIndex.get(hash);

    // Idempotency check: if exact content exists under same ID or hash, return existing version
    if (existingId && this.records.has(existingId)) {
      const history = this.records.get(existingId)!;
      const latest = history[history.length - 1];
      if (latest.metadata.hash === hash) {
        this.logger.debug(`Idempotent write intercepted for ${type} (${id}). Content hash matches v${latest.metadata.version}`);
        return latest as CoreForgeRecord<T>;
      }
    }

    const history = this.records.get(id) || [];
    const nextVersion = history.length + 1;
    const now = new Date().toISOString();

    const record: CoreForgeRecord<T> = {
      metadata: {
        id,
        version: nextVersion,
        hash,
        createdAt: history.length > 0 ? history[0].metadata.createdAt : now,
        updatedAt: now,
        tags
      },
      type,
      data
    };

    history.push(record as CoreForgeRecord<unknown>);
    this.records.set(id, history);
    this.hashIndex.set(hash, id);

    this.logger.info(`Persisted ${type} into CoreForge [id: ${id}, v: ${nextVersion}, hash: ${hash.substring(0, 8)}]`);
    return record;
  }

  public saveCreativeFingerprint(id: string, data: StoredCreativeFingerprint, tags?: string[]): CoreForgeRecord<StoredCreativeFingerprint> {
    return this.storeRecord(id, 'fingerprint', data, tags);
  }

  public saveStylisticPattern(id: string, data: StoredStylisticPattern, tags?: string[]): CoreForgeRecord<StoredStylisticPattern> {
    return this.storeRecord(id, 'pattern', data, tags);
  }

  public saveNarrativeArc(id: string, data: StoredNarrativeArc, tags?: string[]): CoreForgeRecord<StoredNarrativeArc> {
    return this.storeRecord(id, 'arc', data, tags);
  }

  public saveEmotionalTone(id: string, data: StoredEmotionalTone, tags?: string[]): CoreForgeRecord<StoredEmotionalTone> {
    return this.storeRecord(id, 'tone', data, tags);
  }

  public saveBrandIdentity(id: string, data: StoredBrandIdentity, tags?: string[]): CoreForgeRecord<StoredBrandIdentity> {
    return this.storeRecord(id, 'brand', data, tags);
  }

  public saveEvolutionNote(id: string, data: StoredEvolutionNote, tags?: string[]): CoreForgeRecord<StoredEvolutionNote> {
    return this.storeRecord(id, 'evolution', data, tags);
  }

  public getById<T = unknown>(id: string, version?: number): CoreForgeRecord<T> | null {
    const history = this.records.get(id);
    if (!history || history.length === 0) return null;

    if (version !== undefined) {
      const found = history.find(r => r.metadata.version === version);
      return (found as CoreForgeRecord<T>) || null;
    }

    return history[history.length - 1] as CoreForgeRecord<T>;
  }

  public getHistory<T = unknown>(id: string): CoreForgeRecord<T>[] {
    const history = this.records.get(id);
    return (history || []) as CoreForgeRecord<T>[];
  }

  public queryByType<T = unknown>(type: CoreForgeRecord<unknown>['type']): CoreForgeRecord<T>[] {
    const results: CoreForgeRecord<T>[] = [];
    for (const history of this.records.values()) {
      const latest = history[history.length - 1];
      if (latest.type === type) {
        results.push(latest as CoreForgeRecord<T>);
      }
    }
    return results;
  }

  public count(): number {
    return this.records.size;
  }
}
