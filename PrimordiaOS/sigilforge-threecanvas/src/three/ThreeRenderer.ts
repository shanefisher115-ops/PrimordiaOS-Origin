import * as THREE from 'three';

export interface RendererOptions {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: WebGLPowerPreference;
  maxPixelRatio?: number;
}

export class ThreeRenderer {
  private renderer: THREE.WebGLRenderer;
  private maxPixelRatio: number;

  constructor(width: number, height: number, options: RendererOptions = {}) {
    this.maxPixelRatio = options.maxPixelRatio ?? 2;

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? true,
      powerPreference: options.powerPreference ?? 'high-performance',
      preserveDrawingBuffer: true, // Crucial for lossless export rasterization
    });

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.setSize(width, height);
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public setSize(width: number, height: number): void {
    const dpr = typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
      : 1;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.remove();
    }
  }
}
