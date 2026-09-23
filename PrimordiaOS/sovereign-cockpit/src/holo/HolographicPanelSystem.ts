/**
 * PrimordiaOS Sovereign Cockpit — Holographic Panel System
 * Manages 3D spatial compositing, dynamic panel instantiation,
 * focus/blur stacks, depth sorting, and smooth transition physics.
 */

import { logger } from '../logging/CockpitLogger.js';
import {
  HolographicPanelState,
  PanelRegistry
} from './PanelRegistry.js';

export type LayoutPreset = 'CommandDeck' | 'Arcade' | 'NeuralTheater' | 'TelemetryHub';

export class HolographicPanelSystem {
  private panels: Map<string, HolographicPanelState> = new Map();
  private focusedPanelId: string | null = null;
  private currentLayout: LayoutPreset = 'CommandDeck';
  private nextDepthLayer: number = 1;

  constructor() {
    this.applyLayout('CommandDeck');
    logger.info('HolographicPanelSystem', 'Initialized Holographic Panel Compositor with layout: CommandDeck');
  }

  /**
   * Spawns a new panel instance from a registered blueprint.
   */
  public spawnPanel(
    blueprintId: string,
    overrides?: Partial<HolographicPanelState>
  ): HolographicPanelState | null {
    const blueprint = PanelRegistry.getBlueprint(blueprintId);
    if (!blueprint) {
      logger.error('HolographicPanelSystem', `Cannot spawn unknown blueprint: ${blueprintId}`);
      return null;
    }

    const id = overrides?.id || `panel-${blueprint.category.toLowerCase()}-${Date.now()}`;
    const initialPos = overrides?.position || { ...blueprint.defaultPosition };

    const panel: HolographicPanelState = {
      id,
      blueprintId,
      title: overrides?.title || blueprint.name,
      category: blueprint.category,
      position: { ...initialPos },
      targetPosition: overrides?.targetPosition || { ...initialPos },
      rotation: overrides?.rotation || { ...blueprint.defaultRotation },
      dimensions: overrides?.dimensions || { ...blueprint.defaultDimensions },
      opacity: overrides?.opacity !== undefined ? overrides.opacity : 0.0, // Fades in smoothly
      targetOpacity: overrides?.targetOpacity !== undefined ? overrides.targetOpacity : 0.95,
      isFocused: false,
      isMinimized: false,
      depthLayer: this.nextDepthLayer++,
      fresnelGlowIntensity: 0.3,
      contentData: overrides?.contentData || {},
      lastUpdated: Date.now()
    };

    this.panels.set(id, panel);

    // Call onMount hook if defined
    if (blueprint.hooks.onMount) {
      try {
        blueprint.hooks.onMount(panel);
      } catch (err) {
        logger.error('HolographicPanelSystem', `Error in panel onMount for ${id}: ${err}`);
      }
    }

    logger.info('HolographicPanelSystem', `Spawned holographic panel [${id}] (${blueprint.name})`);
    return panel;
  }

  /**
   * Destroys a panel and triggers its onDestroy lifecycle hook.
   */
  public destroyPanel(id: string): boolean {
    const panel = this.panels.get(id);
    if (!panel) return false;

    const blueprint = PanelRegistry.getBlueprint(panel.blueprintId);
    if (blueprint?.hooks.onDestroy) {
      try {
        blueprint.hooks.onDestroy(panel);
      } catch (err) {
        logger.error('HolographicPanelSystem', `Error in panel onDestroy for ${id}: ${err}`);
      }
    }

    if (this.focusedPanelId === id) {
      this.focusedPanelId = null;
    }

    this.panels.delete(id);
    logger.info('HolographicPanelSystem', `Destroyed holographic panel [${id}]`);
    return true;
  }

  /**
   * Focuses a panel, adjusting depth layers and fresnel highlights.
   */
  public focusPanel(id: string): boolean {
    const target = this.panels.get(id);
    if (!target) return false;

    if (this.focusedPanelId === id) return true;

    // Blur existing focused panel
    if (this.focusedPanelId) {
      const prev = this.panels.get(this.focusedPanelId);
      if (prev) {
        prev.isFocused = false;
        prev.fresnelGlowIntensity = 0.25;
        const prevBp = PanelRegistry.getBlueprint(prev.blueprintId);
        prevBp?.hooks.onBlur?.(prev);
      }
    }

    // Elevate target
    target.isFocused = true;
    target.depthLayer = this.nextDepthLayer++;
    target.fresnelGlowIntensity = 0.85;
    this.focusedPanelId = id;

    const targetBp = PanelRegistry.getBlueprint(target.blueprintId);
    targetBp?.hooks.onFocus?.(target);

    logger.debug('HolographicPanelSystem', `Focused panel: ${id}`);
    return true;
  }

  /**
   * Routes telemetry or custom state payload to matching panels.
   */
  public routeDataToPanels(category: HolographicPanelState['category'], data: Record<string, unknown>): void {
    for (const panel of this.panels.values()) {
      if (panel.category === category) {
        panel.contentData = { ...panel.contentData, ...data };
        panel.lastUpdated = Date.now();
      }
    }
  }

  /**
   * Ticks panel physics: linear interpolation (lerp) toward target positions & opacities.
   */
  public updateTransitions(deltaSeconds: number): void {
    const lerpSpeed = Math.min(1.0, deltaSeconds * 8.0);

    for (const panel of this.panels.values()) {
      // Lerp Position
      panel.position.x += (panel.targetPosition.x - panel.position.x) * lerpSpeed;
      panel.position.y += (panel.targetPosition.y - panel.position.y) * lerpSpeed;
      panel.position.z += (panel.targetPosition.z - panel.position.z) * lerpSpeed;

      // Lerp Opacity
      panel.opacity += (panel.targetOpacity - panel.opacity) * lerpSpeed;

      // Update Blueprint hook
      const bp = PanelRegistry.getBlueprint(panel.blueprintId);
      bp?.hooks.onUpdate?.(panel, deltaSeconds * 1000);
    }
  }

  /**
   * Applies pre-configured sovereign layout arrangements.
   */
  public applyLayout(preset: LayoutPreset): void {
    this.currentLayout = preset;

    // Clear existing panels gracefully
    for (const id of Array.from(this.panels.keys())) {
      this.destroyPanel(id);
    }

    switch (preset) {
      case 'CommandDeck':
        this.spawnPanel('blueprint-kernel-system', { position: { x: -380, y: 120, z: 220 } });
        this.spawnPanel('blueprint-moneyplughub', { position: { x: 380, y: 120, z: 220 } });
        this.spawnPanel('blueprint-unreal-viewport', { position: { x: 0, y: 40, z: 140 } });
        this.spawnPanel('blueprint-visioncore', { position: { x: -380, y: -180, z: 240 } });
        this.spawnPanel('blueprint-kernel-console', { position: { x: 380, y: -180, z: 240 } });
        break;

      case 'NeuralTheater':
        this.spawnPanel('blueprint-unreal-viewport', {
          position: { x: 0, y: 0, z: 80 },
          dimensions: { width: 960, height: 540, depth: 30 }
        });
        this.spawnPanel('blueprint-visioncore', { position: { x: -450, y: -220, z: 260 } });
        this.spawnPanel('blueprint-kernel-console', { position: { x: 450, y: -220, z: 260 } });
        break;

      case 'TelemetryHub':
        this.spawnPanel('blueprint-kernel-system', { position: { x: -350, y: 160, z: 200 } });
        this.spawnPanel('blueprint-moneyplughub', { position: { x: 350, y: 160, z: 200 } });
        this.spawnPanel('blueprint-visioncore', { position: { x: -350, y: -160, z: 200 } });
        this.spawnPanel('blueprint-kernel-console', { position: { x: 350, y: -160, z: 200 } });
        break;

      case 'Arcade':
        this.spawnPanel('blueprint-unreal-viewport', { position: { x: 0, y: 80, z: 120 } });
        this.spawnPanel('blueprint-kernel-console', { position: { x: 0, y: -220, z: 200 } });
        break;
    }

    logger.info('HolographicPanelSystem', `Applied layout preset: ${preset} with ${this.panels.size} panels`);
  }

  public getPanels(): HolographicPanelState[] {
    return Array.from(this.panels.values()).sort((a, b) => a.depthLayer - b.depthLayer);
  }

  public getPanel(id: string): HolographicPanelState | undefined {
    return this.panels.get(id);
  }

  public getFocusedPanelId(): string | null {
    return this.focusedPanelId;
  }

  public getLayout(): LayoutPreset {
    return this.currentLayout;
  }
}
