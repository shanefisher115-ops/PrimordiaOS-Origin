import * as THREE from 'three';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export interface SafetyStatus {
  contextLost: boolean;
  quarantinedShaders: string[];
  activeTextures: number;
  activeGeometries: number;
  activeMaterials: number;
  lastErrorTimestamp: number | null;
}

export class SigilForgeSafetyLayer {
  private logger = new SigilForgeLogger('SafetyLayer');
  private contextLost: boolean = false;
  private quarantinedShaders: Set<string> = new Set();
  private trackedGeometries: Set<THREE.BufferGeometry> = new Set();
  private trackedMaterials: Set<THREE.Material> = new Set();
  private trackedTextures: Set<THREE.Texture> = new Set();
  private lastErrorTimestamp: number | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private onRestoreCallback: (() => void) | null = null;

  constructor() {
    this.logger.info('SigilForgeSafetyLayer initialized');
  }

  public bindCanvas(canvas: HTMLCanvasElement, onRestore?: () => void): void {
    this.canvasElement = canvas;
    this.onRestoreCallback = onRestore || null;

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
  }

  public unbindCanvas(): void {
    if (this.canvasElement) {
      this.canvasElement.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvasElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.canvasElement = null;
      this.onRestoreCallback = null;
    }
  }

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.lastErrorTimestamp = Date.now();
    this.logger.error('WebGL context lost! Rendering paused. Awaiting context restoration.');
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
    this.logger.sovereign('WebGL context successfully restored. Reinitializing render pipeline.');
    if (this.onRestoreCallback) {
      try {
        this.onRestoreCallback();
      } catch (err) {
        this.logger.error('Error invoking onRestoreCallback', err);
      }
    }
  };

  public isContextLost(): boolean {
    return this.contextLost;
  }

  public quarantineShader(shaderName: string, reason: string): void {
    this.quarantinedShaders.add(shaderName);
    this.lastErrorTimestamp = Date.now();
    this.logger.warn(`Shader '${shaderName}' quarantined. Reason: ${reason}`);
  }

  public isShaderQuarantined(shaderName: string): boolean {
    return this.quarantinedShaders.has(shaderName);
  }

  public getFallbackMaterial(): THREE.Material {
    return new THREE.MeshBasicMaterial({
      color: 0x6644aa,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
  }

  public trackGeometry(geom: THREE.BufferGeometry): THREE.BufferGeometry {
    this.trackedGeometries.add(geom);
    return geom;
  }

  public trackMaterial(mat: THREE.Material): THREE.Material {
    this.trackedMaterials.add(mat);
    return mat;
  }

  public trackTexture(tex: THREE.Texture): THREE.Texture {
    this.trackedTextures.add(tex);
    return tex;
  }

  public purgeTrackedResources(): void {
    let disposedGeoms = 0;
    for (const geom of this.trackedGeometries) {
      geom.dispose();
      disposedGeoms++;
    }
    this.trackedGeometries.clear();

    let disposedMats = 0;
    for (const mat of this.trackedMaterials) {
      mat.dispose();
      disposedMats++;
    }
    this.trackedMaterials.clear();

    let disposedTex = 0;
    for (const tex of this.trackedTextures) {
      tex.dispose();
      disposedTex++;
    }
    this.trackedTextures.clear();

    this.logger.info('SafetyLayer purged tracked GPU resources', {
      disposedGeoms,
      disposedMats,
      disposedTex,
    });
  }

  public getStatus(): SafetyStatus {
    return {
      contextLost: this.contextLost,
      quarantinedShaders: Array.from(this.quarantinedShaders),
      activeTextures: this.trackedTextures.size,
      activeGeometries: this.trackedGeometries.size,
      activeMaterials: this.trackedMaterials.size,
      lastErrorTimestamp: this.lastErrorTimestamp,
    };
  }
}
