/**
 * PrimordiaOS Sovereign Cockpit — CRT Renderer Subsystem
 * Simulates raster electron beam sweeps, P22 phosphor luminescence decay,
 * scanlines, barrel distortion, and Gaussian noise injection.
 */
import { logger } from '../logging/CockpitLogger.js';
import { CRTMath, DEFAULT_CRT_UNIFORMS } from './CRTShaders.js';
export class CRTRenderer {
    width;
    height;
    buffer;
    uniforms;
    frameCount = 0;
    lastFrameTimestamp = Date.now();
    stats = {
        frameCount: 0,
        fps: 60,
        activePhosphors: 0,
        lastRenderDurationMs: 0
    };
    constructor(width = 120, height = 40, uniforms) {
        this.width = width;
        this.height = height;
        this.uniforms = { ...DEFAULT_CRT_UNIFORMS, ...uniforms };
        this.buffer = new Array(width * height);
        this.clear();
        logger.info('CRTRenderer', `Initialized virtual CRT raster grid [${width}x${height}] with LUT: ${this.uniforms.lut}`);
    }
    clear() {
        for (let i = 0; i < this.width * this.height; i++) {
            this.buffer[i] = { r: 0, g: 0, b: 0, decayLuminance: 0.0 };
        }
    }
    setLUT(lut) {
        this.uniforms.lut = lut;
        logger.info('CRTRenderer', `Switched active Color LUT to: ${lut}`);
    }
    getUniforms() {
        return { ...this.uniforms };
    }
    updateUniforms(partial) {
        this.uniforms = { ...this.uniforms, ...partial };
    }
    /**
     * Draws a pixel onto the virtual phosphor grid with RGB triad values.
     */
    drawPixel(x, y, r, g, b) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height)
            return;
        // Apply barrel curvature coordinates
        const [curvedXNorm, curvedYNorm] = CRTMath.calculateBarrelDistortion(x / this.width, y / this.height, this.uniforms.curvature);
        const targetX = Math.round(curvedXNorm * (this.width - 1));
        const targetY = Math.round(curvedYNorm * (this.height - 1));
        if (targetX < 0 || targetX >= this.width || targetY < 0 || targetY >= this.height)
            return;
        const idx = targetY * this.width + targetX;
        const [lutR, lutG, lutB] = CRTMath.applyLUT(r, g, b, this.uniforms.lut);
        // Charge phosphors
        const lum = (lutR * 0.299 + lutG * 0.587 + lutB * 0.114) / 255;
        this.buffer[idx] = {
            r: lutR,
            g: lutG,
            b: lutB,
            decayLuminance: Math.min(1.0, (this.buffer[idx]?.decayLuminance || 0) * 0.4 + lum)
        };
    }
    /**
     * Writes text onto the virtual raster grid.
     */
    drawText(x, y, text, r = 255, g = 190, b = 20) {
        for (let i = 0; i < text.length; i++) {
            this.drawPixel(x + i, y, r, g, b);
        }
    }
    /**
     * Simulates scanline sweep and temporal phosphor decay across all cells.
     */
    processDecay(deltaSeconds) {
        let activePhosphors = 0;
        for (let i = 0; i < this.buffer.length; i++) {
            const pixel = this.buffer[i];
            if (pixel.decayLuminance > 0.005) {
                pixel.decayLuminance = CRTMath.calculatePhosphorDecay(pixel.decayLuminance, deltaSeconds, this.uniforms.phosphorPersistence * 0.15);
                pixel.r = Math.round(pixel.r * pixel.decayLuminance);
                pixel.g = Math.round(pixel.g * pixel.decayLuminance);
                pixel.b = Math.round(pixel.b * pixel.decayLuminance);
                activePhosphors++;
            }
            else {
                pixel.decayLuminance = 0;
                pixel.r = 0;
                pixel.g = 0;
                pixel.b = 0;
            }
        }
        this.stats.activePhosphors = activePhosphors;
    }
    /**
     * Renders a frame, updates simulation stats, and returns an ASCII/ANSI scanline snapshot.
     */
    renderFrame() {
        const start = Date.now();
        const now = Date.now();
        const deltaSeconds = Math.max(0.001, (now - this.lastFrameTimestamp) / 1000);
        this.lastFrameTimestamp = now;
        // Process phosphor decay pass
        this.processDecay(deltaSeconds);
        this.frameCount++;
        this.stats.frameCount = this.frameCount;
        this.stats.fps = Math.round(1 / deltaSeconds);
        // Build ASCII scanline representation
        let output = '';
        for (let y = 0; y < this.height; y++) {
            const isScanlineDim = y % 2 === 1 && this.uniforms.scanlineIntensity > 0.3;
            for (let x = 0; x < this.width; x++) {
                const pixel = this.buffer[y * this.width + x];
                if (pixel.decayLuminance > 0.6) {
                    output += isScanlineDim ? '*' : '#';
                }
                else if (pixel.decayLuminance > 0.2) {
                    output += isScanlineDim ? '.' : '+';
                }
                else if (pixel.decayLuminance > 0.05) {
                    output += '.';
                }
                else {
                    // Subtle noise injection in blank space
                    const noise = Math.random() < this.uniforms.noiseStrength * 0.2 ? '·' : ' ';
                    output += noise;
                }
            }
            output += '\n';
        }
        this.stats.lastRenderDurationMs = Date.now() - start;
        return { textSnapshot: output, stats: { ...this.stats } };
    }
    getStats() {
        return { ...this.stats };
    }
}
