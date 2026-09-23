import * as THREE from 'three';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export type ShockwaveCallback = (normalizedX: number, normalizedY: number) => void;
export type PanelToggleCallback = (panelId: string, isVisible: boolean) => void;

export class CanvasInteractionLayer {
  private logger = new SigilForgeLogger('InteractionLayer');
  private targetElement: HTMLElement | null = null;

  private rawPointer: THREE.Vector2 = new THREE.Vector2(0, 0);
  private smoothedPointer: THREE.Vector2 = new THREE.Vector2(0, 0);
  private isHovered: boolean = false;
  private isPressed: boolean = false;

  private shockwaveListeners: Set<ShockwaveCallback> = new Set();
  private panelToggleListeners: Set<PanelToggleCallback> = new Set();
  private panelStates: Map<string, boolean> = new Map();

  private lerpSpeed: number = 6.0;

  constructor() {
    this.logger.info('CanvasInteractionLayer initialized');
  }

  public bind(element: HTMLElement): void {
    this.targetElement = element;

    element.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    element.addEventListener('pointerenter', this.handlePointerEnter, { passive: true });
    element.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
    element.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    element.addEventListener('pointerup', this.handlePointerUp, { passive: true });

    this.logger.debug('Bound pointer event listeners to canvas container');
  }

  public unbind(): void {
    if (this.targetElement) {
      this.targetElement.removeEventListener('pointermove', this.handlePointerMove);
      this.targetElement.removeEventListener('pointerenter', this.handlePointerEnter);
      this.targetElement.removeEventListener('pointerleave', this.handlePointerLeave);
      this.targetElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.targetElement.removeEventListener('pointerup', this.handlePointerUp);
      this.targetElement = null;
    }
    this.shockwaveListeners.clear();
    this.panelToggleListeners.clear();
  }

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.targetElement) return;
    const rect = this.targetElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    this.rawPointer.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  };

  private handlePointerEnter = (): void => {
    this.isHovered = true;
  };

  private handlePointerLeave = (): void => {
    this.isHovered = false;
    this.rawPointer.set(0, 0);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.isPressed = true;
    if (!this.targetElement) return;

    const rect = this.targetElement.getBoundingClientRect();
    const uvX = (e.clientX - rect.left) / rect.width;
    const uvY = 1.0 - (e.clientY - rect.top) / rect.height;

    this.triggerShockwave(uvX, uvY);
  };

  private handlePointerUp = (): void => {
    this.isPressed = false;
  };

  public triggerShockwave(x: number, y: number): void {
    this.logger.debug(`Triggering click shockwave at (${x.toFixed(2)}, ${y.toFixed(2)})`);
    for (const listener of this.shockwaveListeners) {
      try {
        listener(x, y);
      } catch (err) {
        this.logger.error('Error invoking shockwave listener', err);
      }
    }
  }

  public onShockwave(callback: ShockwaveCallback): () => void {
    this.shockwaveListeners.add(callback);
    return () => this.shockwaveListeners.delete(callback);
  }

  public onPanelToggle(callback: PanelToggleCallback): () => void {
    this.panelToggleListeners.add(callback);
    return () => this.panelToggleListeners.delete(callback);
  }

  public togglePanel(panelId: string): boolean {
    const currentState = this.panelStates.get(panelId) || false;
    const newState = !currentState;
    this.panelStates.set(panelId, newState);

    for (const listener of this.panelToggleListeners) {
      try {
        listener(panelId, newState);
      } catch (err) {
        this.logger.error('Error in panelToggle listener', err);
      }
    }

    this.logger.info(`Panel '${panelId}' toggled to: ${newState}`);
    return newState;
  }

  public isPanelOpen(panelId: string): boolean {
    return this.panelStates.get(panelId) || false;
  }

  public update(deltaTime: number): void {
    // Smooth lerp pointer coordinates for camera parallax and specular flare inertia
    const factor = 1.0 - Math.exp(-this.lerpSpeed * deltaTime);
    this.smoothedPointer.lerp(this.rawPointer, factor);
  }

  public getPointer(): THREE.Vector2 {
    return this.rawPointer;
  }

  public getSmoothedPointer(): THREE.Vector2 {
    return this.smoothedPointer;
  }

  public getIsHovered(): boolean {
    return this.isHovered;
  }

  public getIsPressed(): boolean {
    return this.isPressed;
  }
}
