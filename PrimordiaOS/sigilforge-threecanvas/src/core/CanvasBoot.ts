import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';

export interface BootResult {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  isWebGL2: boolean;
}

export class CanvasBoot {
  private static logger = new SigilForgeLogger('CanvasBoot');

  public static boot(containerOrSelector?: HTMLElement | string): BootResult {
    this.logger.info('Commencing CanvasBoot sequence...');

    let container: HTMLElement | null = null;
    if (typeof containerOrSelector === 'string') {
      container = document.querySelector<HTMLElement>(containerOrSelector);
    } else if (containerOrSelector instanceof HTMLElement) {
      container = containerOrSelector;
    }

    if (!container) {
      if (typeof document !== 'undefined') {
        container = document.createElement('div');
        container.id = 'sigilforge-container';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);
        this.logger.info('Spawned default fullscreen container for SigilForge');
      } else {
        throw new Error('CanvasBoot: DOM document is not available');
      }
    }

    // Inspect WebGL support
    const testCanvas = document.createElement('canvas');
    const gl2 = testCanvas.getContext('webgl2');
    const gl1 = gl2 || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');

    if (!gl1) {
      this.logger.error('WebGL is not supported on this device/browser');
      throw new Error('WebGL is not supported in the current environment.');
    }

    const isWebGL2 = Boolean(gl2);
    const gl = (gl2 || gl1) as WebGLRenderingContext;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown GPU';

    this.logger.sovereign(`WebGL Boot Verified. Version: ${isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0'} | GPU: ${rendererStr}`);

    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth || 1920;
    const height = rect.height || window.innerHeight || 1080;

    let canvas = container.querySelector<HTMLCanvasElement>('canvas.sigilforge-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'sigilforge-canvas';
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
    }

    return {
      container,
      canvas,
      width,
      height,
      isWebGL2,
    };
  }
}
