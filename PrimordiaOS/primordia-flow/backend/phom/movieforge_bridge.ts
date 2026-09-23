/**
 * ==============================================================================
 * 🎬 MOVIEFORGE 4K NEURAL THEATER & CINEMATIC DIRECTOR BRIDGE
 * Fuses the Primordia Flow Agent Swarm and Unreal Engine 5.8 Pipelines
 * with the MovieForge 4K Procedural Shader Cinema and DaVinci 3D LUT Engine.
 * Masterplane Gateway: http://localhost:3000 & ws://localhost:3000/ws
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';

export type MovieForgeLut = 'IMPERIAL GOLD' | 'CYBERPUNK EMERALD' | 'NEUTRAL RAW' | 'VOID MONOLITH';

export type CameraAngle = 'orbit' | 'drone_sweep' | 'crane_dolly' | 'vertigo_zoom' | 'cosmic_ascend';

export function normalizeLut(lut: string): MovieForgeLut {
  const clean = String(lut || '').toUpperCase().replace(/[_ -]+/g, ' ').trim();
  if (clean.includes('VOID') || clean.includes('MONOLITH')) return 'VOID MONOLITH';
  if (clean.includes('EMERALD') || clean.includes('CYBER')) return 'CYBERPUNK EMERALD';
  if (clean.includes('RAW') || clean.includes('NEUTRAL')) return 'NEUTRAL RAW';
  return 'IMPERIAL GOLD';
}

export interface TheaterState {
  activeLut: MovieForgeLut;
  currentTrack: string;
  isPlaying: boolean;
  mediaUrl: string | null;
  audioSynthEnabled: boolean;
  lastUpdated: string;
  connected: boolean;
}

export interface CinematicCutsceneRequest {
  prompt: string;
  angle?: CameraAngle;
  duration?: number;
  fps?: number;
}

export interface CinematicCutsceneResult {
  success: boolean;
  sequenceId?: string;
  angle?: string;
  biome?: string;
  lut?: string;
  duration?: number;
  totalKeyframes?: number;
  error?: string;
}

const MASTERPLANE_URL = process.env.PRIMORDIA_MASTERPLANE_URL || 'http://127.0.0.1:3000';

/**
 * Queries current MovieForge Theater state from Masterplane port 3000.
 */
export async function getTheaterState(): Promise<TheaterState> {
  try {
    const res = await fetch(`${MASTERPLANE_URL}/api/theater/state`, {
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        connected: true
      };
    }
  } catch (_) {}

  return {
    activeLut: 'IMPERIAL GOLD',
    currentTrack: 'eventhorizon',
    isPlaying: true,
    mediaUrl: null,
    audioSynthEnabled: false,
    lastUpdated: new Date().toISOString(),
    connected: false
  };
}

/**
 * Triggers a DaVinci Resolve 3D LUT Color Grade shift in MovieForge Theater.
 */
export async function setTheaterLut(lut: string): Promise<{ success: boolean; activeLut?: string; error?: string }> {
  const normLut = normalizeLut(lut);
  try {
    const res = await fetch(`${MASTERPLANE_URL}/api/theater/lut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lut: normLut }),
      signal: AbortSignal.timeout(2000)
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, activeLut: data.activeLut || normLut };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Records a cinematic super-burst session directly into the Neural Theater renders manifest.
 */
export function recordCinematicBurstManifest(burstId: string, details: {
  nodes: number;
  mode: string;
  cameraOrbits: string[];
  lutSequence: string[];
  p99LatencyMs: number;
  durationMs: number;
}): { manifestPath: string; recordingId: string } {
  const rendersDir = path.resolve('C:\\Users\\Shane\\renders');
  const jobFolder = path.join(rendersDir, burstId);
  try {
    if (!fs.existsSync(jobFolder)) {
      fs.mkdirSync(jobFolder, { recursive: true });
    }
    const manifest = {
      id: burstId,
      userPrompt: `PrimordiaOS 111-Node Super-Burst [${details.mode.toUpperCase()}] across Unreal Engine 5.8 & MovieForge 4K`,
      durationSeconds: Math.round((details.durationMs / 1000) * 10) / 10,
      fps: 60,
      nodesExecuted: details.nodes,
      cameraOrbits: details.cameraOrbits,
      lutSequence: details.lutSequence,
      telemetry: {
        p99LatencyMs: details.p99LatencyMs,
        engineVersion: '5.8',
        gatewayWs: 'ws://localhost:3000/unreal-gateway'
      },
      environment: {
        lut: normalizeLut(details.lutSequence[details.lutSequence.length - 1] || 'VOID MONOLITH'),
        biome: 'quantum_nexus'
      },
      recordedAt: new Date().toISOString()
    };
    const manifestPath = path.join(jobFolder, 'ShotManifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return { manifestPath, recordingId: burstId };
  } catch (_) {
    return { manifestPath: '', recordingId: burstId };
  }
}

/**
 * Triggers procedural camera trajectory synthesis & scene generation via the Cinematic Director.
 */
export async function triggerCinematicCutscene(req: CinematicCutsceneRequest): Promise<CinematicCutsceneResult> {
  try {
    const res = await fetch(`${MASTERPLANE_URL}/api/cinematics/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: req.prompt,
        angle: req.angle || 'orbit',
        duration: req.duration || 6,
        fps: req.fps || 60
      }),
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        sequenceId: data.sequenceId || data.manifest?.id,
        angle: data.angle || req.angle,
        biome: data.biome,
        lut: data.lut,
        duration: data.duration,
        totalKeyframes: data.keyframes?.length || 6
      };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Streams media to MovieForge Theater.
 */
export async function loadTheaterMedia(url: string): Promise<{ success: boolean; mediaUrl?: string; error?: string }> {
  try {
    const res = await fetch(`${MASTERPLANE_URL}/api/theater/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, mediaUrl: data.mediaUrl || url };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * High-level Cinematic Trigger Automation:
 * Maps system and agent events directly to synchronized MovieForge LUTs,
 * camera transitions, and audio cues.
 */
export async function emitCinematicTrigger(eventType: 'deal_closed' | 'email_opened' | 'inbound_reply' | 'outbound_sent' | 'swarm_burst' | 'game_dev_audit', details?: any) {
  switch (eventType) {
    case 'deal_closed':
      // Imperial Gold supernova
      await setTheaterLut('IMPERIAL GOLD');
      return triggerCinematicCutscene({
        prompt: `Deal Closer Supernova: Executive contract bonded with ${details?.companyName || 'Enterprise Partner'}. Imperial Gold radiance across Unreal Engine 5.8 viewport.`,
        angle: 'cosmic_ascend',
        duration: 8
      });

    case 'email_opened':
      // Cyberpunk Emerald supercritical telemetry
      await setTheaterLut('CYBERPUNK EMERALD');
      return triggerCinematicCutscene({
        prompt: `Supercritical Telemetry Burst: Executive prospect opened architecture brief for ${details?.domain || 'studio pipeline'}. High-speed drone sweep over neon cyber mesh.`,
        angle: 'drone_sweep',
        duration: 5
      });

    case 'inbound_reply':
      // Quantum Convergence Vertigo Zoom
      await setTheaterLut('CYBERPUNK EMERALD');
      return triggerCinematicCutscene({
        prompt: `Quantum Inbound Convergence: High-affinity response received from ${details?.domain || 'prospect'}. Hitchcock vertigo dolly zoom into neural node.`,
        angle: 'vertigo_zoom',
        duration: 6
      });

    case 'swarm_burst':
      // Void Monolith or Imperial Gold high-energy crane dolly
      await setTheaterLut('IMPERIAL GOLD');
      return triggerCinematicCutscene({
        prompt: `111-Node Quantum Swarm Super-Burst: Full-spectrum Niagara particle saturation and procedural scene synthesis across all 11 autonomous agents.`,
        angle: 'crane_dolly',
        duration: 10
      });

    case 'game_dev_audit':
      // Cyberpunk Emerald orbit
      await setTheaterLut('CYBERPUNK EMERALD');
      return triggerCinematicCutscene({
        prompt: `Unreal Engine 5.8 Pipeline Audit for ${details?.companyName || 'Game Studio'}: Slashing shader compile bottlenecks and Nanite baking latency.`,
        angle: 'orbit',
        duration: 7
      });

    case 'outbound_sent':
    default:
      return triggerCinematicCutscene({
        prompt: `Laser Tracer Outbound Dispatch: Cryptographic proposal transmitted to ${details?.domain || 'remote node'}.`,
        angle: 'orbit',
        duration: 4
      });
  }
}
