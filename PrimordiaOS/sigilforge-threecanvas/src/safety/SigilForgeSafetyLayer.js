import * as THREE from 'three';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';
export class SigilForgeSafetyLayer {
    logger = new SigilForgeLogger('SafetyLayer');
    contextLost = false;
    quarantinedShaders = new Set();
    trackedGeometries = new Set();
    trackedMaterials = new Set();
    trackedTextures = new Set();
    lastErrorTimestamp = null;
    canvasElement = null;
    onRestoreCallback = null;
    constructor() {
        this.logger.info('SigilForgeSafetyLayer initialized');
    }
    bindCanvas(canvas, onRestore) {
        this.canvasElement = canvas;
        this.onRestoreCallback = onRestore || null;
        canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
        canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
    }
    unbindCanvas() {
        if (this.canvasElement) {
            this.canvasElement.removeEventListener('webglcontextlost', this.handleContextLost);
            this.canvasElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
            this.canvasElement = null;
            this.onRestoreCallback = null;
        }
    }
    handleContextLost = (event) => {
        event.preventDefault();
        this.contextLost = true;
        this.lastErrorTimestamp = Date.now();
        this.logger.error('WebGL context lost! Rendering paused. Awaiting context restoration.');
    };
    handleContextRestored = () => {
        this.contextLost = false;
        this.logger.sovereign('WebGL context successfully restored. Reinitializing render pipeline.');
        if (this.onRestoreCallback) {
            try {
                this.onRestoreCallback();
            }
            catch (err) {
                this.logger.error('Error invoking onRestoreCallback', err);
            }
        }
    };
    isContextLost() {
        return this.contextLost;
    }
    quarantineShader(shaderName, reason) {
        this.quarantinedShaders.add(shaderName);
        this.lastErrorTimestamp = Date.now();
        this.logger.warn(`Shader '${shaderName}' quarantined. Reason: ${reason}`);
    }
    isShaderQuarantined(shaderName) {
        return this.quarantinedShaders.has(shaderName);
    }
    getFallbackMaterial() {
        return new THREE.MeshBasicMaterial({
            color: 0x6644aa,
            wireframe: true,
            transparent: true,
            opacity: 0.8,
        });
    }
    trackGeometry(geom) {
        this.trackedGeometries.add(geom);
        return geom;
    }
    trackMaterial(mat) {
        this.trackedMaterials.add(mat);
        return mat;
    }
    trackTexture(tex) {
        this.trackedTextures.add(tex);
        return tex;
    }
    purgeTrackedResources() {
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
    getStatus() {
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
