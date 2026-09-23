import * as THREE from 'three';
import { SigilItem } from '../items/ItemMetadata.js';
import { HueWheel } from './HueWheel.js';
import { OrbitalVelocityController } from './OrbitalVelocity.js';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export interface ActiveSigilLayer {
  item: SigilItem;
  color: string;
  scale: number;
  rotation: number;
  opacity: number;
  blendMode: GlobalCompositeOperation;
}

export class SigilCompositionEngine {
  private logger = new SigilForgeLogger('CompositionEngine');
  private layers: ActiveSigilLayer[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private texture: THREE.CanvasTexture;
  private hueWheel: HueWheel;
  private orbitalVelocity: OrbitalVelocityController;
  private canvasSize: number = 1024;
  private needsRedraw: boolean = true;

  constructor() {
    this.hueWheel = new HueWheel();
    this.orbitalVelocity = new OrbitalVelocityController();

    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.canvasSize;
      this.canvas.height = this.canvasSize;
      this.ctx = this.canvas.getContext('2d');
    } else {
      // Mock / SSR canvas fallback
      this.canvas = {} as HTMLCanvasElement;
      this.ctx = null;
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.logger.info('SigilCompositionEngine initialized');
  }

  public getHueWheel(): HueWheel {
    return this.hueWheel;
  }

  public getOrbitalVelocity(): OrbitalVelocityController {
    return this.orbitalVelocity;
  }

  public getCanvasTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  public addLayer(item: SigilItem, color?: string): void {
    // Check if layer category already exists, replace or append
    const existingIndex = this.layers.findIndex((l) => l.item.category === item.category);
    const assignedColor = color || this.hueWheel.getPalette(9)[item.layerIndex % 9];

    const newLayer: ActiveSigilLayer = {
      item,
      color: assignedColor,
      scale: item.defaultScale,
      rotation: item.defaultRotation,
      opacity: 0.95,
      blendMode: 'screen',
    };

    if (existingIndex >= 0) {
      this.layers[existingIndex] = newLayer;
    } else {
      this.layers.push(newLayer);
    }

    // Sort by layerIndex ascending
    this.layers.sort((a, b) => a.item.layerIndex - b.item.layerIndex);
    this.needsRedraw = true;
    this.logger.debug(`Added/Updated layer: ${item.name} (${item.category})`);
  }

  public removeLayer(itemId: string): void {
    const prevLen = this.layers.length;
    this.layers = this.layers.filter((l) => l.item.id !== itemId);
    if (this.layers.length !== prevLen) {
      this.needsRedraw = true;
      this.logger.debug(`Removed layer with id: ${itemId}`);
    }
  }

  public clearLayers(): void {
    this.layers = [];
    this.needsRedraw = true;
  }

  public getLayers(): ActiveSigilLayer[] {
    return [...this.layers];
  }

  public update(deltaTime: number, audioEnergy: number = 0, bass: number = 0): void {
    this.orbitalVelocity.update(deltaTime, audioEnergy, bass);
    this.renderToCanvas();
  }

  public renderToCanvas(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const center = this.canvasSize / 2;

    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    for (const layer of this.layers) {
      const item = layer.item;
      const orbitAngle = this.orbitalVelocity.getAngle(item.layerIndex);
      const totalAngle = (layer.rotation * Math.PI) / 180 + orbitAngle;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(totalAngle);
      ctx.scale(layer.scale, layer.scale);
      ctx.translate(-center, -center);

      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;

      // Draw SVG Path via Path2D
      try {
        const path2d = new Path2D(item.svgPath);
        // Map 500x500 viewBox to 1024x1024 canvas
        const scaleFactor = this.canvasSize / 500;
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor);

        // Outer glow stroke
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = 5;
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = 15;
        ctx.stroke(path2d);

        // Core fill & crisp stroke
        ctx.fillStyle = layer.color + '22';
        ctx.fill(path2d);
        ctx.lineWidth = 2;
        ctx.stroke(path2d);

        ctx.restore();
      } catch (err) {
        this.logger.error(`Error rendering SVG Path2D for item ${item.id}`, err);
      }

      ctx.restore();
    }

    this.texture.needsUpdate = true;
    this.needsRedraw = false;
  }

  public generateCompositeSvg(): string {
    const palette = this.hueWheel.getPalette(9);
    let defsGradients = '';
    let pathsSvg = '';

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const item = layer.item;
      const angle = layer.rotation + (this.orbitalVelocity.getAngle(item.layerIndex) * 180) / Math.PI;
      const color = layer.color || palette[item.layerIndex % 9];

      const gradId = `grad_${item.id}_${i}`;
      defsGradients += `
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}" stop-opacity="1" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.8" />
        </linearGradient>
      `;

      pathsSvg += `
        <g id="${item.id}" transform="rotate(${angle.toFixed(2)} 250 250) scale(${layer.scale})">
          <path d="${item.svgPath}" fill="none" stroke="url(#${gradId})" stroke-width="3" filter="drop-shadow(0 0 8px ${color})" />
          <path d="${item.svgPath}" fill="${color}" fill-opacity="0.12" />
        </g>
      `;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <style>
      path { vector-effect: non-scaling-stroke; }
    </style>
    ${defsGradients}
  </defs>
  <rect width="100%" height="100%" fill="#05030a" />
  ${pathsSvg}
</svg>`;
  }

  public dispose(): void {
    this.texture.dispose();
    this.layers = [];
  }
}
