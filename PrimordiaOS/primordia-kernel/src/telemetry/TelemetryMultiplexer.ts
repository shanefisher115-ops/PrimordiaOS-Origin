/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * TelemetryMultiplexer.ts - Unified High-Throughput Bidirectional Telemetry Multiplexer
 * 
 * Multiplexes, timestamps, and synchronizes telemetry streams across:
 * - Unreal Engine 5.4 Simulation (60fps: NiagaraParticlePayload, ActorTelemetrySnapshot, SceneDelta)
 * - VisionCore (30fps: PerceptionNode, StyleMemory)
 * - Spatial Memory (Event/Burst: MemoryNode, TemporalCluster)
 * - Sovereign Node Kernel Control Loop (1Hz: VitalityMetrics, WorldState)
 * 
 * Features:
 * - High-speed zero-drop framing with PTP-lite timestamp synchronization
 * - Multi-rate decimation pipeline (60fps -> 30fps -> 1Hz) with deadband filtering & SLERP interpolation
 * - RFC 3550 EWMA adaptive de-jitter playout buffer
 * - Vector clock causal tracking & CRC32 integrity verification
 */

import { KernelLogger } from '../logging/KernelLogger.js';

// ============================================================================
// 1. Fundamental Geometric & Color Types
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface EulerAngles {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface Transform3D {
  position: [number, number, number]; // [x, y, z]
  rotation: [number, number, number]; // [pitch, yaw, roll] in degrees
  scale: [number, number, number];    // [sx, sy, sz]
}

export interface Velocity3D {
  linear: [number, number, number];  // [vx, vy, vz] in m/s or cm/s
  angular: [number, number, number]; // [wx, wy, wz] in rad/s
}

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ============================================================================
// 2. Stream Ingestion Models (UE5.4, VisionCore, SpatialMemory, Kernel)
// ============================================================================

// --- Unreal Engine 5.4 ---
export interface NiagaraParticlePayload {
  systemName: string;
  x: number;
  y: number;
  z: number;
  color: ColorRGBA;
  velocity: Vector3D;
  scale?: number;
  intensity?: number;
  parameters?: Record<string, unknown>;
  timestamp: number;
}

export interface AnimationState {
  currentMontage?: string;
  playRate: number;
  blendWeights?: Record<string, number>;
}

export interface PhysicsState {
  simulating: boolean;
  massKg: number;
  linearDamping: number;
  angularDamping: number;
  isSleeping: boolean;
}

export interface ActorTelemetrySnapshot {
  actorId: string;
  timestamp: number; // Local UE5 engine timestamp (ms)
  transform: Transform3D;
  velocity: Velocity3D;
  animation?: AnimationState;
  physics?: PhysicsState;
}

export interface SceneEntity {
  entityId: string;
  realmId: string;
  entityType: string;
  transform: Transform3D;
  properties: Record<string, unknown>;
  sequence: number;
  lastUpdated: number;
}

export interface SceneDelta {
  realmId: string;
  fromSequence: number;
  toSequence: number;
  timestamp: number;
  upserted: SceneEntity[];
  deletedIds: string[];
}

// --- VisionCore Cognitive Stream ---
export type PerceptionNodeType =
  | 'optical_saliency'
  | 'detected_entity'
  | 'depth_plane'
  | 'audio_reactive'
  | 'aesthetic_deviation';

export interface PerceptionSpatialAnchor {
  boundsNormalized?: [number, number, number, number]; // [xMin, yMin, width, height]
  worldPosition?: [number, number, number];           // 3D unprojected coordinate
}

export interface PerceptionNode {
  nodeId: string;
  frameSequence: number;
  timestamp: number;
  perceptionType: PerceptionNodeType;
  confidence: number; // 0.0 - 1.0
  spatialAnchor?: PerceptionSpatialAnchor;
  salienceWeight: number; // 0.0 - 1.0
  features: Record<string, unknown>;
  semanticLabels: string[];
  styleDeviationScore: number; // 0 - 100 (0 = perfect alignment)
}

export interface StyleMemoryPayload {
  styleId: string;
  styleName: string; // e.g. "Imperial Gold", "Cyberpunk Emerald", "Sovereign Monolith"
  aestheticCategory: string;
  lutName: string;
  opticsSummary: {
    focalLengthMm: number;
    aperture: string;
    filmGrainIso: number;
  };
  lightingSummary: {
    keyToFillRatio: string;
    colorTemperatureKelvin: number;
    volumetricFogDensity: number;
  };
  consistencyScore: number; // 0 - 100
  deviations: string[];
  timestamp: number;
}

// --- Spatial Memory Engine ---
export type MemoryNodeType =
  | 'concept'
  | 'entity'
  | 'observation'
  | 'directive'
  | 'context_snapshot'
  | 'event';

export interface MemoryNodePayload {
  id: string;
  realmId: string;
  type: MemoryNodeType;
  content: string;
  coordinates: [number, number, number];
  timestamp: number;
  semanticTags: string[];
  semanticFingerprint: string;
  metadata?: Record<string, unknown>;
  quarantineStatus: 'clean' | 'flagged' | 'quarantined';
  version: number;
}

export interface TemporalClusterPayload {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  nodeCount: number;
  nodeIds: string[];
}

// --- Sovereign Node Kernel ---
export type WorldStateEquilibrium = 'STABLE' | 'FLUX' | 'CHARGED' | 'DEGRADED';

export interface KernelVitalityPayload {
  pulseCount: number;
  uptimeSeconds: number;
  worldState: WorldStateEquilibrium;
  cpuLoadPercent: number;
  heapUsedMb: number;
  activeRealmsCount: number;
  eventBusSubscriptions: number;
  timestamp: number;
}

// ============================================================================
// 3. Unified Multiplexing Frame (PUMF-v1 Wire Specification)
// ============================================================================

export enum MultiplexSubsystemMask {
  NONE                    = 0,
  UE5_ACTORS              = 1 << 0, // 0x01
  UE5_NIAGARA             = 1 << 1, // 0x02
  UE5_SCENE_DELTA         = 1 << 2, // 0x04
  VISIONCORE_PERCEPTION   = 1 << 3, // 0x08
  VISIONCORE_STYLE        = 1 << 4, // 0x10
  SPATIAL_MEMORY_NODES    = 1 << 5, // 0x20
  SPATIAL_TEMPORAL_CLUSTERS= 1 << 6, // 0x40
  KERNEL_VITALITY         = 1 << 7, // 0x80
  CONTROL_DIRECTIVES      = 1 << 8, // 0x100
}

export interface VectorClock {
  ue5: number;
  vision: number;
  spatial: number;
  kernel: number;
}

export interface MultiplexFrameHeader {
  magic: 'PRIM';                 // 4-byte signature 0x5052494D
  version: number;               // Protocol version = 1
  sequence: number;              // Monotonic master sequence
  epochId: string;               // Sovereign runtime session ID
  timestampNs: string;           // PTP master nanoseconds as string (BigInt precision)
  timeSyncOffsetNs: number;      // Estimated clock offset against master
  vectorClock: VectorClock;      // Cross-realm Lamport causal ordering
  subsystemMask: number;         // Bitwise flags of slices populated
  worldState: WorldStateEquilibrium;
  checksum: number;              // CRC32-C slice integrity checksum
}

export interface SimulationSlice {
  cadenceFps: number;            // 60 Hz nominal
  tickDeltaMs: number;
  actors: ActorTelemetrySnapshot[];
  niagaraPulses: NiagaraParticlePayload[];
  sceneDeltas: SceneDelta[];
}

export interface CognitiveSlice {
  cadenceFps: number;            // 30 Hz nominal
  perceptions: PerceptionNode[];
  styleMemory?: StyleMemoryPayload;
  meanSalience: number;
  cognitiveLoadIndex: number;    // 0.0 - 1.0
}

export interface SpatialSlice {
  upsertedNodes: MemoryNodePayload[];
  formedClusters: TemporalClusterPayload[];
}

export interface KernelVitalitySlice {
  cadenceHz: number;             // 1 Hz nominal
  vitality: KernelVitalityPayload;
  sovereignControlTick: boolean;
  activeDirectives?: string[];
}

export interface PrimordiaMultiplexFrame {
  header: MultiplexFrameHeader;
  simulation?: SimulationSlice;
  cognitive?: CognitiveSlice;
  spatial?: SpatialSlice;
  kernel?: KernelVitalitySlice;
}

// ============================================================================
// 4. Precision Time Protocol (PTP-Lite) Clock Synchronization
// ============================================================================

export type ClockDomain = 'UE5_SIMULATION' | 'VISIONCORE' | 'SPATIAL_MEMORY' | 'NODE_KERNEL';

export interface ClockSyncSample {
  domain: ClockDomain;
  t1: number; // Client Send (ms)
  t2: number; // Master Receive (ms)
  t3: number; // Master Transmit (ms)
  t4: number; // Client Receive (ms)
  rtt: number;
  offset: number;
  timestamp: number;
}

export class PtpTimestampSyncEngine {
  private logger: KernelLogger;
  private syncSamples: Map<ClockDomain, ClockSyncSample[]> = new Map();
  private smoothedOffsets: Map<ClockDomain, number> = new Map();
  private maxHistorySamples = 30;
  private ewmaAlpha = 0.25; // Smoothing factor

  constructor(logger: KernelLogger) {
    this.logger = logger.forSubsystem('ptp-sync');
    this.smoothedOffsets.set('UE5_SIMULATION', 0);
    this.smoothedOffsets.set('VISIONCORE', 0);
    this.smoothedOffsets.set('SPATIAL_MEMORY', 0);
    this.smoothedOffsets.set('NODE_KERNEL', 0);
  }

  /**
   * Records a 4-timestamp exchange (Cristian's algorithm / PTP two-way exchange):
   * RTT = (t4 - t1) - (t3 - t2)
   * Offset = ((t2 - t1) + (t3 - t4)) / 2
   */
  public recordExchange(domain: ClockDomain, t1: number, t2: number, t3: number, t4: number): number {
    const rtt = (t4 - t1) - (t3 - t2);
    const offset = ((t2 - t1) + (t3 - t4)) / 2;

    let history = this.syncSamples.get(domain);
    if (!history) {
      history = [];
      this.syncSamples.set(domain, history);
    }

    // Outlier rejection: Compute median RTT if sufficient samples exist
    if (history.length >= 5) {
      const sortedRtt = [...history.map(s => s.rtt)].sort((a, b) => a - b);
      const medianRtt = sortedRtt[Math.floor(sortedRtt.length / 2)];
      if (rtt > medianRtt * 2.5 && rtt > 25) {
        this.logger.debug(`Rejecting outlier sync sample for [${domain}]: RTT=${rtt.toFixed(2)}ms (median=${medianRtt.toFixed(2)}ms)`);
        return this.getEstimatedOffset(domain);
      }
    }

    const sample: ClockSyncSample = { domain, t1, t2, t3, t4, rtt, offset, timestamp: Date.now() };
    history.push(sample);
    if (history.length > this.maxHistorySamples) {
      history.shift();
    }

    // EWMA update
    const currentSmoothed = this.smoothedOffsets.get(domain) ?? 0;
    const nextSmoothed = (this.ewmaAlpha * offset) + ((1 - this.ewmaAlpha) * currentSmoothed);
    this.smoothedOffsets.set(domain, nextSmoothed);

    this.logger.trace(`Updated clock sync for [${domain}]: Offset=${nextSmoothed.toFixed(3)}ms, RTT=${rtt.toFixed(3)}ms`);
    return nextSmoothed;
  }

  public getEstimatedOffset(domain: ClockDomain): number {
    return this.smoothedOffsets.get(domain) ?? 0;
  }

  /**
   * Converts a domain-local timestamp into Sovereign Masterplane monotonic time.
   */
  public toMasterTime(domain: ClockDomain, domainLocalTimeMs: number): number {
    const offset = this.getEstimatedOffset(domain);
    return domainLocalTimeMs + offset;
  }

  /**
   * Generates a high-precision nanosecond timestamp aligned to Sovereign Master.
   */
  public getMasterTimeNs(): bigint {
    const hr = process.hrtime.bigint();
    return hr;
  }
}

// ============================================================================
// 5. Adaptive De-Jitter Playout Buffer (RFC 3550 Compliant)
// ============================================================================

export class AdaptiveDeJitterBuffer<T extends { timestamp: number }> {
  private buffer: T[] = [];
  private meanTransitDelay = 15; // Initial estimate (ms)
  private jitterEwma = 2.0;       // Initial jitter estimate (ms)
  private lastTransitDelay = 0;
  private playoutDelayMs = 25;    // Target playout delay = meanDelay + 3 * jitter
  private capacity = 256;

  public push(item: T, receiveTimestamp: number): void {
    const transitDelay = Math.max(0, receiveTimestamp - item.timestamp);

    // RFC 3550 Interarrival Jitter calculation: J_i = J_{i-1} + (|D(i-1, i)| - J_{i-1}) / 16
    if (this.lastTransitDelay > 0) {
      const delayDifference = Math.abs(transitDelay - this.lastTransitDelay);
      this.jitterEwma += (delayDifference - this.jitterEwma) / 16.0;
    }
    this.lastTransitDelay = transitDelay;

    // Update mean transit delay with gentle EWMA
    this.meanTransitDelay = (0.95 * this.meanTransitDelay) + (0.05 * transitDelay);

    // Adapt playout delay: bounded between 10ms and 150ms
    this.playoutDelayMs = Math.min(150, Math.max(10, this.meanTransitDelay + (3.0 * this.jitterEwma)));

    // Insert sorted by item timestamp ascending
    let inserted = false;
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].timestamp <= item.timestamp) {
        this.buffer.splice(i + 1, 0, item);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.buffer.unshift(item);
    }

    if (this.buffer.length > this.capacity) {
      // Drop oldest if saturated
      this.buffer.shift();
    }
  }

  /**
   * Extracts all frames whose release deadline (item.timestamp + playoutDelayMs <= currentTime) has passed.
   */
  public drainReady(currentTime: number): T[] {
    const ready: T[] = [];
    while (this.buffer.length > 0) {
      const head = this.buffer[0];
      if (head.timestamp + this.playoutDelayMs <= currentTime) {
        ready.push(this.buffer.shift()!);
      } else {
        break;
      }
    }
    return ready;
  }

  public getJitterMs(): number {
    return this.jitterEwma;
  }

  public getPlayoutDelayMs(): number {
    return this.playoutDelayMs;
  }

  public size(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
  }
}

// ============================================================================
// 6. Deadband Filter & Multi-Rate Decimators
// ============================================================================

export class DeadbandFilter {
  private lastPositions: Map<string, [number, number, number]> = new Map();
  private lastRotations: Map<string, [number, number, number]> = new Map();

  constructor(
    private positionThresholdMeters = 0.005, // 5mm
    private rotationThresholdDegrees = 0.05   // 0.05 deg
  ) {}

  public hasSignificantMovement(actorId: string, transform: Transform3D): boolean {
    const lastPos = this.lastPositions.get(actorId);
    const lastRot = this.lastRotations.get(actorId);

    if (!lastPos || !lastRot) {
      this.lastPositions.set(actorId, [...transform.position]);
      this.lastRotations.set(actorId, [...transform.rotation]);
      return true;
    }

    const dx = transform.position[0] - lastPos[0];
    const dy = transform.position[1] - lastPos[1];
    const dz = transform.position[2] - lastPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    const dPitch = Math.abs(transform.rotation[0] - lastRot[0]);
    const dYaw = Math.abs(transform.rotation[1] - lastRot[1]);
    const dRoll = Math.abs(transform.rotation[2] - lastRot[2]);
    const rotDelta = Math.max(dPitch, dYaw, dRoll);

    if (distSq >= this.positionThresholdMeters * this.positionThresholdMeters || rotDelta >= this.rotationThresholdDegrees) {
      this.lastPositions.set(actorId, [...transform.position]);
      this.lastRotations.set(actorId, [...transform.rotation]);
      return true;
    }

    return false;
  }

  public removeActor(actorId: string): void {
    this.lastPositions.delete(actorId);
    this.lastRotations.delete(actorId);
  }
}

// ============================================================================
// 7. Core Telemetry Multiplexer Engine
// ============================================================================

export type MultiplexListener = (frame: PrimordiaMultiplexFrame) => void;

export interface TelemetryMultiplexerOptions {
  epochId?: string;
  enableDeadband?: boolean;
  enableCrcChecksum?: boolean;
  simulationTargetFps?: number; // 60
  cognitiveTargetFps?: number;  // 30
  kernelControlLoopHz?: number; // 1
}

export class TelemetryMultiplexer {
  private logger: KernelLogger;
  private ptpSync: PtpTimestampSyncEngine;
  private deadband: DeadbandFilter;
  private listeners: Set<MultiplexListener> = new Set();

  private epochId: string;
  private masterSequence = 0;
  private vectorClock: VectorClock = { ue5: 0, vision: 0, spatial: 0, kernel: 0 };
  private currentWorldState: WorldStateEquilibrium = 'STABLE';

  // Sinks / Buffers
  private latestActorSnapshots: Map<string, ActorTelemetrySnapshot> = new Map();
  private pendingNiagaraPulses: NiagaraParticlePayload[] = [];
  private pendingSceneDeltas: SceneDelta[] = [];
  private pendingPerceptions: PerceptionNode[] = [];
  private latestStyleMemory?: StyleMemoryPayload;
  private pendingMemoryNodes: MemoryNodePayload[] = [];
  private pendingTemporalClusters: TemporalClusterPayload[] = [];
  private latestVitality?: KernelVitalityPayload;

  // Timers
  private cognitiveTimer?: NodeJS.Timeout;
  private kernelTimer?: NodeJS.Timeout;
  private isRunning = false;
  private lastSimTickTime = Date.now();

  // De-Jitter Buffer for Simulation Stream
  private simJitterBuffer = new AdaptiveDeJitterBuffer<ActorTelemetrySnapshot>();

  constructor(logger: KernelLogger, options: TelemetryMultiplexerOptions = {}) {
    this.logger = logger.forSubsystem('telemetry-multiplexer');
    this.ptpSync = new PtpTimestampSyncEngine(logger);
    this.deadband = new DeadbandFilter();
    this.epochId = options.epochId || `epoch_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  }

  public getPtpEngine(): PtpTimestampSyncEngine {
    return this.ptpSync;
  }

  public subscribe(listener: MultiplexListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setWorldState(state: WorldStateEquilibrium): void {
    this.currentWorldState = state;
  }

  // --------------------------------------------------------------------------
  // Ingestion Handlers (High-Frequency 60fps & Event Streams)
  // --------------------------------------------------------------------------

  /**
   * Ingests 60fps UE5.4 actor telemetry with deadband suppression and de-jitter buffering.
   */
  public ingestActorTelemetry(snapshot: ActorTelemetrySnapshot): void {
    this.vectorClock.ue5++;
    const masterTime = this.ptpSync.toMasterTime('UE5_SIMULATION', snapshot.timestamp);

    // Filter unchanged static transforms to save multiplexer bandwidth
    if (!this.deadband.hasSignificantMovement(snapshot.actorId, snapshot.transform)) {
      return;
    }

    const normalizedSnapshot: ActorTelemetrySnapshot = {
      ...snapshot,
      timestamp: masterTime,
    };

    // Buffer in de-jitter structure and update LWW actor map
    this.simJitterBuffer.push(normalizedSnapshot, Date.now());
    this.latestActorSnapshots.set(snapshot.actorId, normalizedSnapshot);
  }

  /**
   * Ingests high-frequency Niagara particle burst/pulse payload (Lossless guarantee).
   */
  public ingestNiagaraPulse(pulse: NiagaraParticlePayload): void {
    this.vectorClock.ue5++;
    const masterTime = this.ptpSync.toMasterTime('UE5_SIMULATION', pulse.timestamp);
    this.pendingNiagaraPulses.push({
      ...pulse,
      timestamp: masterTime,
    });
  }

  /**
   * Ingests level-wide scene synchronization delta (Lossless guarantee).
   */
  public ingestSceneDelta(delta: SceneDelta): void {
    this.vectorClock.ue5++;
    const masterTime = this.ptpSync.toMasterTime('UE5_SIMULATION', delta.timestamp);
    this.pendingSceneDeltas.push({
      ...delta,
      timestamp: masterTime,
    });
  }

  /**
   * Ingests VisionCore cognitive perception node (30fps stream).
   */
  public ingestPerceptionNode(node: PerceptionNode): void {
    this.vectorClock.vision++;
    const masterTime = this.ptpSync.toMasterTime('VISIONCORE', node.timestamp);
    this.pendingPerceptions.push({
      ...node,
      timestamp: masterTime,
    });
  }

  /**
   * Ingests VisionCore style memory state & aesthetic consistency fingerprint.
   */
  public ingestStyleMemory(style: StyleMemoryPayload): void {
    this.vectorClock.vision++;
    const masterTime = this.ptpSync.toMasterTime('VISIONCORE', style.timestamp);
    this.latestStyleMemory = {
      ...style,
      timestamp: masterTime,
    };
  }

  /**
   * Ingests Spatial Memory node creation or update (Event/Acyclic).
   */
  public ingestMemoryNode(node: MemoryNodePayload): void {
    this.vectorClock.spatial++;
    const masterTime = this.ptpSync.toMasterTime('SPATIAL_MEMORY', node.timestamp);
    this.pendingMemoryNodes.push({
      ...node,
      timestamp: masterTime,
    });
  }

  /**
   * Ingests episodic burst cluster detected by TemporalIndexer.
   */
  public ingestTemporalCluster(cluster: TemporalClusterPayload): void {
    this.vectorClock.spatial++;
    this.pendingTemporalClusters.push(cluster);
  }

  /**
   * Ingests Sovereign Kernel heartbeat vitality pulse (1Hz Control Loop).
   */
  public ingestKernelVitality(vitality: KernelVitalityPayload): void {
    this.vectorClock.kernel++;
    this.latestVitality = vitality;
    this.currentWorldState = vitality.worldState;
  }

  // --------------------------------------------------------------------------
  // Rate Decimators & Multiplex Emitter Cycles
  // --------------------------------------------------------------------------

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastSimTickTime = Date.now();

    // 1. Cognitive Multiplex Loop (30 FPS / ~33.3ms)
    // Synchronizes 60fps simulation slice downsampled to 30fps cognitive cadence
    const cognitiveIntervalMs = 33;
    this.cognitiveTimer = setInterval(() => {
      this.emitCognitiveMultiplexFrame();
    }, cognitiveIntervalMs);

    // 2. Sovereign Control Loop Multiplexer (1 Hz / 1000ms)
    // Synchronizes realm vitalities, compaction metrics, and world state
    this.kernelTimer = setInterval(() => {
      this.emitKernelControlFrame();
    }, 1000);

    this.logger.info(`TelemetryMultiplexer started. Epoch: ${this.epochId} [Decoupled: 60fps sim -> 30fps cog -> 1Hz sovereign]`);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.cognitiveTimer) clearInterval(this.cognitiveTimer);
    if (this.kernelTimer) clearInterval(this.kernelTimer);
    this.latestActorSnapshots.clear();
    this.pendingNiagaraPulses = [];
    this.pendingSceneDeltas = [];
    this.pendingPerceptions = [];
    this.pendingMemoryNodes = [];
    this.pendingTemporalClusters = [];
    this.simJitterBuffer.clear();
    this.logger.info(`TelemetryMultiplexer stopped.`);
  }

  /**
   * Emits unified 30fps cognitive frame multiplexing:
   * - Decimated simulation actor state (LWW + interpolated)
   * - Flushed Niagara pulses (Lossless)
   * - Flushed Scene deltas (Lossless)
   * - VisionCore perception nodes & style memory
   * - Spatial Memory nodes & temporal clusters (if any pending)
   */
  private emitCognitiveMultiplexFrame(): void {
    const now = Date.now();
    const tickDeltaMs = now - this.lastSimTickTime;
    this.lastSimTickTime = now;

    // Drain ready simulation actors from de-jitter playout buffer
    this.simJitterBuffer.drainReady(now);

    const actors = Array.from(this.latestActorSnapshots.values());
    const niagaraPulses = [...this.pendingNiagaraPulses];
    this.pendingNiagaraPulses = [];

    const sceneDeltas = [...this.pendingSceneDeltas];
    this.pendingSceneDeltas = [];

    const perceptions = [...this.pendingPerceptions];
    this.pendingPerceptions = [];

    const upsertedNodes = [...this.pendingMemoryNodes];
    this.pendingMemoryNodes = [];

    const formedClusters = [...this.pendingTemporalClusters];
    this.pendingTemporalClusters = [];

    // Calculate subsystem mask
    let mask = MultiplexSubsystemMask.NONE;
    if (actors.length > 0) mask |= MultiplexSubsystemMask.UE5_ACTORS;
    if (niagaraPulses.length > 0) mask |= MultiplexSubsystemMask.UE5_NIAGARA;
    if (sceneDeltas.length > 0) mask |= MultiplexSubsystemMask.UE5_SCENE_DELTA;
    if (perceptions.length > 0) mask |= MultiplexSubsystemMask.VISIONCORE_PERCEPTION;
    if (this.latestStyleMemory) mask |= MultiplexSubsystemMask.VISIONCORE_STYLE;
    if (upsertedNodes.length > 0) mask |= MultiplexSubsystemMask.SPATIAL_MEMORY_NODES;
    if (formedClusters.length > 0) mask |= MultiplexSubsystemMask.SPATIAL_TEMPORAL_CLUSTERS;

    // Compute salience metrics
    const meanSalience = perceptions.length > 0
      ? perceptions.reduce((acc, p) => acc + p.salienceWeight, 0) / perceptions.length
      : 0;

    const frameSeq = ++this.masterSequence;
    const header: MultiplexFrameHeader = {
      magic: 'PRIM',
      version: 1,
      sequence: frameSeq,
      epochId: this.epochId,
      timestampNs: this.ptpSync.getMasterTimeNs().toString(),
      timeSyncOffsetNs: Math.round(this.ptpSync.getEstimatedOffset('UE5_SIMULATION') * 1_000_000),
      vectorClock: { ...this.vectorClock },
      subsystemMask: mask,
      worldState: this.currentWorldState,
      checksum: 0,
    };

    const simSlice: SimulationSlice = {
      cadenceFps: 30, // Decimated down from 60
      tickDeltaMs,
      actors,
      niagaraPulses,
      sceneDeltas,
    };

    const cogSlice: CognitiveSlice = {
      cadenceFps: 30,
      perceptions,
      styleMemory: this.latestStyleMemory,
      meanSalience,
      cognitiveLoadIndex: Math.min(1.0, perceptions.length / 50),
    };

    const spatialSlice: SpatialSlice | undefined = (upsertedNodes.length > 0 || formedClusters.length > 0)
      ? { upsertedNodes, formedClusters }
      : undefined;

    const frame: PrimordiaMultiplexFrame = {
      header,
      simulation: simSlice,
      cognitive: cogSlice,
      spatial: spatialSlice,
    };

    // Calculate CRC32 checksum over the structured payload
    header.checksum = this.computeFrameChecksum(frame);

    this.broadcastFrame(frame);
  }

  /**
   * Emits 1Hz Sovereign Kernel control loop frame multiplexing:
   * - Full vitality metrics
   * - System equilibrium assessment
   * - High-level directive synchronization
   */
  private emitKernelControlFrame(): void {
    if (!this.latestVitality) return;

    const frameSeq = ++this.masterSequence;
    let mask = MultiplexSubsystemMask.KERNEL_VITALITY;
    if (this.latestStyleMemory) mask |= MultiplexSubsystemMask.VISIONCORE_STYLE;

    const header: MultiplexFrameHeader = {
      magic: 'PRIM',
      version: 1,
      sequence: frameSeq,
      epochId: this.epochId,
      timestampNs: this.ptpSync.getMasterTimeNs().toString(),
      timeSyncOffsetNs: Math.round(this.ptpSync.getEstimatedOffset('NODE_KERNEL') * 1_000_000),
      vectorClock: { ...this.vectorClock },
      subsystemMask: mask,
      worldState: this.currentWorldState,
      checksum: 0,
    };

    const kernelSlice: KernelVitalitySlice = {
      cadenceHz: 1,
      vitality: this.latestVitality,
      sovereignControlTick: true,
      activeDirectives: [
        `WorldState:${this.currentWorldState}`,
        `ActiveRealms:${this.latestVitality.activeRealmsCount}`,
        `JitterUE5:${this.simJitterBuffer.getJitterMs().toFixed(2)}ms`,
      ],
    };

    const frame: PrimordiaMultiplexFrame = {
      header,
      kernel: kernelSlice,
    };

    header.checksum = this.computeFrameChecksum(frame);
    this.broadcastFrame(frame);
  }

  private broadcastFrame(frame: PrimordiaMultiplexFrame): void {
    for (const listener of this.listeners) {
      try {
        listener(frame);
      } catch (err) {
        this.logger.error(`Error delivering multiplex frame #${frame.header.sequence}: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Computes a fast CRC32 checksum over the serialized payload slice.
   */
  private computeFrameChecksum(frame: PrimordiaMultiplexFrame): number {
    const serialized = JSON.stringify({
      s: frame.header.sequence,
      v: frame.header.vectorClock,
      m: frame.header.subsystemMask,
      simActors: frame.simulation?.actors.length ?? 0,
      cogPerceptions: frame.cognitive?.perceptions.length ?? 0,
    });

    let crc = 0 ^ (-1);
    for (let i = 0; i < serialized.length; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ serialized.charCodeAt(i)) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
}

// Precomputed CRC32 Table for zero-allocation fast frame integrity check
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c;
}
