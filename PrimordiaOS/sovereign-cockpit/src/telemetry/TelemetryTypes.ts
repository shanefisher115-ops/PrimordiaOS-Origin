/**
 * PrimordiaOS Sovereign Cockpit — Multi-Realm Telemetry Types
 * Enforces normalized payloads and contracts across all realms.
 */

export type RealmSource =
  | 'MoneyPlugHub'
  | 'PrimordiaOSKernel'
  | 'VisionCore'
  | 'UnrealBridge'
  | 'SystemInternal';

export type WorldState = 'STABLE' | 'FLUX' | 'CHARGED' | 'PANIC';

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
  position: Vector3D;
  rotation: EulerAngles;
  scale: Vector3D;
}

// 1. MoneyPlugHub Telemetry Payload
export interface MoneyPlugHubPayload {
  loopId: string;
  revenueVelocityPerHour: number;
  totalDealFlow: number;
  activeCampaigns: number;
  impressions: number;
  conversions: number;
  idempotencyToken: string;
  loopYieldPercentage: number;
}

// 2. PrimordiaOS Kernel Telemetry Payload
export interface PrimordiaKernelPayload {
  worldState: WorldState;
  cpuLoadPercent: number;
  memoryUsageBytes: number;
  totalMemoryBytes: number;
  activeSwarmWorkers: number;
  pendingDiskMutations: number;
  antigravScore: number;
  uptimeSeconds: number;
  licenseTier: string;
}

// 3. VisionCore Optical & Audio Telemetry Payload
export interface VisionCorePayload {
  frameRate: number;
  inferenceConfidence: number;
  detectedEntitiesCount: number;
  sceneClassification: string;
  latencyMs: number;
  audioReactivity: {
    bassLevel: number;    // 0.0 - 1.0
    midLevel: number;     // 0.0 - 1.0
    trebleLevel: number;  // 0.0 - 1.0
    spectralCentroid: number;
  };
}

// 4. Unreal Engine 5.4 Bridge Telemetry Payload
export interface UnrealBridgePayload {
  packetType: 'niagara_pulse' | 'mesh_stream' | 'actor_spawn' | 'camera_sync';
  connectedClients: number;
  physicsTickRate: number;
  activeActorsCount: number;
  niagaraParticleCount: number;
  cameraTransform: Transform3D;
  lastActorPulse?: {
    actorId: string;
    coordinates: Vector3D;
    velocity: Vector3D;
    colorHex: string;
  };
}

// Generic Telemetry Map
export type RealmTelemetryMap = {
  MoneyPlugHub: MoneyPlugHubPayload;
  PrimordiaOSKernel: PrimordiaKernelPayload;
  VisionCore: VisionCorePayload;
  UnrealBridge: UnrealBridgePayload;
  SystemInternal: Record<string, unknown>;
};

// Normalized Envelope
export interface TelemetryEnvelope<T = unknown> {
  id: string;
  timestamp: number;
  source: RealmSource;
  realm: string;
  payload: T;
  entropyScore: number;
  signature?: string;
}

export type TelemetryFilter = (envelope: TelemetryEnvelope) => boolean;
export type TelemetryHandler<T = unknown> = (envelope: TelemetryEnvelope<T>) => void | Promise<void>;
