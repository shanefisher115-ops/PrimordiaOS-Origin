/**
 * PrimordiaOS Sovereign Cockpit — Holographic Panel Registry & Blueprints
 * Defines spatial contracts, holographic attributes, lifecycle callbacks,
 * and built-in panel blueprints.
 */

import { Vector3D, EulerAngles } from '../telemetry/TelemetryTypes.js';

export interface PanelDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface HolographicPanelState {
  id: string;
  blueprintId: string;
  title: string;
  category: 'TELEMETRY' | 'SYSTEM' | 'SIMULATION' | 'VISION' | 'CONSOLE';
  position: Vector3D;
  targetPosition: Vector3D;
  rotation: EulerAngles;
  dimensions: PanelDimensions;
  opacity: number;
  targetOpacity: number;
  isFocused: boolean;
  isMinimized: boolean;
  depthLayer: number;
  fresnelGlowIntensity: number;
  contentData: Record<string, unknown>;
  lastUpdated: number;
}

export interface PanelLifecycleHooks {
  onMount?: (panel: HolographicPanelState) => void;
  onUpdate?: (panel: HolographicPanelState, deltaMs: number) => void;
  onRender?: (panel: HolographicPanelState) => string | Record<string, unknown>;
  onDestroy?: (panel: HolographicPanelState) => void;
  onFocus?: (panel: HolographicPanelState) => void;
  onBlur?: (panel: HolographicPanelState) => void;
}

export interface PanelBlueprint {
  id: string;
  name: string;
  category: HolographicPanelState['category'];
  defaultDimensions: PanelDimensions;
  defaultPosition: Vector3D;
  defaultRotation: EulerAngles;
  hooks: PanelLifecycleHooks;
}

export class PanelRegistry {
  private static blueprints: Map<string, PanelBlueprint> = new Map();

  public static registerBlueprint(blueprint: PanelBlueprint): void {
    PanelRegistry.blueprints.set(blueprint.id, blueprint);
  }

  public static getBlueprint(id: string): PanelBlueprint | undefined {
    return PanelRegistry.blueprints.get(id);
  }

  public static getAllBlueprints(): PanelBlueprint[] {
    return Array.from(PanelRegistry.blueprints.values());
  }

  /**
   * Initializes standard PrimordiaOS sovereign panel blueprints.
   */
  public static initializeDefaults(): void {
    // 1. Kernel System Overview Blueprint
    PanelRegistry.registerBlueprint({
      id: 'blueprint-kernel-system',
      name: 'PrimordiaOS Kernel Overview',
      category: 'SYSTEM',
      defaultDimensions: { width: 400, height: 260, depth: 10 },
      defaultPosition: { x: -350, y: 150, z: 200 },
      defaultRotation: { pitch: 0, yaw: 15, roll: 0 },
      hooks: {
        onRender: (p) => ({
          title: p.title,
          worldState: p.contentData.worldState || 'STABLE',
          cpuLoad: p.contentData.cpuLoadPercent || 0,
          memoryUsage: p.contentData.memoryUsageBytes || 0,
          antigravScore: p.contentData.antigravScore || 100
        })
      }
    });

    // 2. MoneyPlugHub Telemetry Blueprint
    PanelRegistry.registerBlueprint({
      id: 'blueprint-moneyplughub',
      name: 'MoneyPlugHub Autonomous Loops',
      category: 'TELEMETRY',
      defaultDimensions: { width: 420, height: 300, depth: 10 },
      defaultPosition: { x: 350, y: 150, z: 200 },
      defaultRotation: { pitch: 0, yaw: -15, roll: 0 },
      hooks: {
        onRender: (p) => ({
          title: p.title,
          velocityPerHour: p.contentData.revenueVelocityPerHour || 0,
          dealFlow: p.contentData.totalDealFlow || 0,
          loopYield: p.contentData.loopYieldPercentage || 0,
          activeCampaigns: p.contentData.activeCampaigns || 0
        })
      }
    });

    // 3. Unreal Engine 5.4 Viewport & Niagara Blueprint
    PanelRegistry.registerBlueprint({
      id: 'blueprint-unreal-viewport',
      name: 'Unreal Engine 5.4 Neural Viewport',
      category: 'SIMULATION',
      defaultDimensions: { width: 640, height: 360, depth: 20 },
      defaultPosition: { x: 0, y: 20, z: 120 },
      defaultRotation: { pitch: 0, yaw: 0, roll: 0 },
      hooks: {
        onRender: (p) => ({
          title: p.title,
          clientCount: p.contentData.connectedClients || 0,
          particleCount: p.contentData.niagaraParticleCount || 0,
          tickRate: p.contentData.physicsTickRate || 60,
          activeActors: p.contentData.activeActorsCount || 0
        })
      }
    });

    // 4. VisionCore Optical & Audio Blueprint
    PanelRegistry.registerBlueprint({
      id: 'blueprint-visioncore',
      name: 'VisionCore Neural Perception',
      category: 'VISION',
      defaultDimensions: { width: 380, height: 240, depth: 10 },
      defaultPosition: { x: -320, y: -200, z: 220 },
      defaultRotation: { pitch: -10, yaw: 15, roll: 0 },
      hooks: {
        onRender: (p) => ({
          title: p.title,
          fps: p.contentData.frameRate || 0,
          confidence: p.contentData.inferenceConfidence || 0,
          scene: p.contentData.sceneClassification || 'Void',
          audio: p.contentData.audioReactivity || { bassLevel: 0, midLevel: 0, trebleLevel: 0 }
        })
      }
    });

    // 5. Sovereign Console Terminal Blueprint
    PanelRegistry.registerBlueprint({
      id: 'blueprint-kernel-console',
      name: 'Sovereign English Terminal (psh)',
      category: 'CONSOLE',
      defaultDimensions: { width: 440, height: 240, depth: 10 },
      defaultPosition: { x: 320, y: -200, z: 220 },
      defaultRotation: { pitch: -10, yaw: -15, roll: 0 },
      hooks: {
        onRender: (p) => ({
          title: p.title,
          lastCommand: p.contentData.lastCommand || '',
          lastOutput: p.contentData.lastOutput || 'Ready.',
          quarantineCount: p.contentData.quarantineCount || 0
        })
      }
    });
  }
}

// Auto-initialize defaults on import
PanelRegistry.initializeDefaults();
