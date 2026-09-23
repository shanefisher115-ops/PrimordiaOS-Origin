import * as THREE from 'three';
export class ThreeRenderer {
    renderer;
    maxPixelRatio;
    constructor(width, height, options = {}) {
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
    getRenderer() {
        return this.renderer;
    }
    getDomElement() {
        return this.renderer.domElement;
    }
    setSize(width, height) {
        const dpr = typeof window !== 'undefined'
            ? Math.min(window.devicePixelRatio || 1, this.maxPixelRatio)
            : 1;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);
    }
    render(scene, camera) {
        this.renderer.render(scene, camera);
    }
    dispose() {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentElement) {
            this.renderer.domElement.remove();
        }
    }
}
