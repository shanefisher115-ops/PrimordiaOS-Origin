import * as THREE from 'three';
import { SigilCompositionEngine } from '../composition/SigilCompositionEngine.js';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export interface ExportOptions {
  filename?: string;
  width?: number;
  height?: number;
  transparentBackground?: boolean;
}

export class SigilExportEngine {
  private logger = new SigilForgeLogger('ExportEngine');
  private composition: SigilCompositionEngine;

  constructor(composition: SigilCompositionEngine) {
    this.composition = composition;
  }

  public exportSvgString(): string {
    return this.composition.generateCompositeSvg();
  }

  public exportPngDataUrl(renderer: THREE.WebGLRenderer): string {
    const canvas = renderer.domElement;
    if (!canvas || typeof canvas.toDataURL !== 'function') {
      this.logger.error('Cannot export PNG data URL: domElement is invalid or lacks toDataURL');
      return '';
    }
    return canvas.toDataURL('image/png');
  }

  public async exportPngBlob(renderer: THREE.WebGLRenderer): Promise<Blob | null> {
    const canvas = renderer.domElement;
    if (!canvas || typeof canvas.toBlob !== 'function') {
      this.logger.error('Cannot export PNG Blob: domElement is invalid or lacks toBlob');
      return null;
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob: Blob | null) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  public async copySvgToClipboard(): Promise<boolean> {
    const svg = this.exportSvgString();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(svg);
        this.logger.info('SVG successfully copied to clipboard');
        return true;
      } catch (err) {
        this.logger.error('Clipboard copy failed', err);
      }
    }
    return false;
  }

  public downloadFile(filename: string, content: string | Blob, mimeType: string = 'image/svg+xml'): void {
    if (typeof document === 'undefined') {
      this.logger.warn('downloadFile called in headless environment, skipping DOM download trigger');
      return;
    }

    const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    this.logger.info(`Triggered browser download for: ${filename}`);
  }

  public async saveToDisk(filename: string, content: string | Buffer): Promise<string> {
    const exportDir = process.env.SIGILFORGE_EXPORT_PATH || './exports';

    try {
      // Dynamic import of node:fs and node:path for server-side execution
      const fs = await import('node:fs/promises');
      const path = await import('node:path');

      await fs.mkdir(exportDir, { recursive: true });
      const targetPath = path.join(exportDir, filename);

      await fs.writeFile(targetPath, content);
      this.logger.sovereign(`File successfully saved to disk: ${targetPath}`);
      return targetPath;
    } catch (err) {
      this.logger.error(`Failed to save ${filename} to disk path: ${exportDir}`, err);
      throw err;
    }
  }
}
