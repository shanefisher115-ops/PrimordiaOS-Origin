import * as THREE from 'three';
import { CanvasBoot } from './CanvasBoot.js';
import { CanvasShutdown } from './CanvasShutdown.js';
import { ThreeCamera } from '../three/ThreeCamera.js';
import { ThreeRenderer } from '../three/ThreeRenderer.js';
import { ThreeSceneBuilder } from '../three/ThreeSceneBuilder.js';
import { AudioReactiveEngine } from '../audio/AudioReactiveEngine.js';
import { SigilItemRegistry } from '../items/SigilItemRegistry.js';
import { SigilCompositionEngine } from '../composition/SigilCompositionEngine.js';
import { CosmicRollEngine } from '../cosmicroll/CosmicRollEngine.js';
import { SigilExportEngine } from '../export/SigilExportEngine.js';
import { CanvasInteractionLayer } from '../interaction/CanvasInteractionLayer.js';
import { SigilForgeSafetyLayer } from '../safety/SigilForgeSafetyLayer.js';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';
export class SigilForgeThreeCanvasEngine {
    logger = new SigilForgeLogger('CanvasEngine');
    clock = new THREE.Clock();
    // Subsystems
    camera;
    renderer;
    sceneBuilder;
    audio;
    registry;
    composition;
    cosmicRoll;
    exporter;
    interaction;
    safety;
    // DOM and lifecycle
    containerElement = null;
    canvasElement = null;
    resizeObserver = null;
    animFrameId = null;
    isRunning = false;
    isInitialized = false;
    enableParallax = true;
    constructor(config = {}) {
        this.enableParallax = config.enableParallax ?? true;
        this.logger.info('Instantiated SigilForgeThreeCanvasEngine');
    }
    async init(containerOrSelector) {
        if (this.isInitialized) {
            this.logger.warn('Engine is already initialized');
            return;
        }
        this.logger.sovereign('Initializing SigilForgeThreeCanvas Subsystem...');
        // 1. Boot Canvas & Container
        const bootResult = CanvasBoot.boot(containerOrSelector);
        this.containerElement = bootResult.container;
        this.canvasElement = bootResult.canvas;
        const width = bootResult.width;
        const height = bootResult.height;
        // 2. Initialize Subsystems
        this.safety = new SigilForgeSafetyLayer();
        this.safety.bindCanvas(this.canvasElement, () => this.handleContextRestored());
        this.camera = new ThreeCamera(width, height);
        this.renderer = new ThreeRenderer(width, height, { canvas: this.canvasElement });
        this.sceneBuilder = new ThreeSceneBuilder();
        this.sceneBuilder.setResolution(width, height);
        this.audio = new AudioReactiveEngine();
        this.registry = SigilItemRegistry.getInstance();
        this.composition = new SigilCompositionEngine();
        this.cosmicRoll = new CosmicRollEngine(this.registry, this.composition);
        this.exporter = new SigilExportEngine(this.composition);
        // Bind Composition texture to the Foil plane in Three.js
        this.sceneBuilder.updateFoilTexture(this.composition.getCanvasTexture());
        // 3. Bind UI Interaction Layer
        this.interaction = new CanvasInteractionLayer();
        this.interaction.bind(this.containerElement);
        // Wire shockwave listener to scene shaders
        this.interaction.onShockwave((x, y) => {
            this.sceneBuilder.triggerShockwave(x, y);
        });
        // 4. Setup Responsive Resize Observer
        this.setupResizeObserver();
        // 5. Initial Cosmic Roll
        this.cosmicRoll.roll(5);
        this.isInitialized = true;
        this.logger.sovereign('SigilForgeThreeCanvas initialized successfully');
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.clock.start();
        this.audio.start();
        this.logger.info('Render loop started');
        this.renderLoop();
    }
    stop() {
        this.isRunning = false;
        if (this.animFrameId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.audio.stop();
        this.logger.info('Render loop paused');
    }
    renderLoop = () => {
        if (!this.isRunning)
            return;
        this.animFrameId = requestAnimationFrame(this.renderLoop);
        // If context is currently lost, skip rendering frame
        if (this.safety.isContextLost()) {
            return;
        }
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        // 1. Process Audio Reactivity
        const audioBands = this.audio.update(deltaTime);
        // 2. Update Interaction & Pointer Physics
        this.interaction.update(deltaTime);
        const pointer = this.interaction.getSmoothedPointer();
        // 3. Update Camera Parallax
        if (this.enableParallax) {
            this.camera.setParallaxOffset(-pointer.x, -pointer.y, 0.45);
            this.camera.update(0.08);
        }
        // 4. Update Composition Engine (orbital rotation, canvas texture redraw)
        this.composition.update(deltaTime, audioBands.energy, audioBands.bass);
        // 5. Update Three Scene Shaders & Metrics
        this.sceneBuilder.update(deltaTime, elapsedTime, {
            bass: audioBands.bass,
            mid: audioBands.mid,
            treble: audioBands.treble,
            amplitude: audioBands.amplitude,
            energy: audioBands.energy,
        }, pointer);
        // 6. Draw WebGL Frame
        this.renderer.render(this.sceneBuilder.getScene(), this.camera.getCamera());
    };
    resize(width, height) {
        if (!this.containerElement)
            return;
        const w = width ?? this.containerElement.clientWidth ?? window.innerWidth;
        const h = height ?? this.containerElement.clientHeight ?? window.innerHeight;
        if (w <= 0 || h <= 0)
            return;
        this.camera.updateAspect(w, h);
        this.renderer.setSize(w, h);
        this.sceneBuilder.setResolution(w, h);
        this.logger.debug(`Resized viewport to: ${w}x${h}`);
    }
    setupResizeObserver() {
        if (typeof ResizeObserver === 'undefined' || !this.containerElement)
            return;
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    this.resize(width, height);
                }
            }
        });
        this.resizeObserver.observe(this.containerElement);
    }
    handleContextRestored() {
        this.logger.sovereign('Handling WebGL Context Restoration...');
        if (this.containerElement) {
            this.resize();
        }
    }
    // --- Public High-Level Controls ---
    triggerCosmicRoll(itemCount) {
        return this.cosmicRoll.roll(itemCount);
    }
    exportSvg() {
        return this.exporter.exportSvgString();
    }
    exportPng() {
        return this.exporter.exportPngDataUrl(this.renderer.getRenderer());
    }
    async enableMicrophone() {
        return this.audio.initMicrophone();
    }
    getComposition() {
        return this.composition;
    }
    getItemRegistry() {
        return this.registry;
    }
    getCosmicRollEngine() {
        return this.cosmicRoll;
    }
    getInteractionLayer() {
        return this.interaction;
    }
    getSafetyLayer() {
        return this.safety;
    }
    getLogger() {
        return this.logger;
    }
    dispose() {
        this.stop();
        CanvasShutdown.execute({
            animFrameId: this.animFrameId,
            resizeObserver: this.resizeObserver,
            sceneBuilder: this.sceneBuilder,
            renderer: this.renderer,
            audio: this.audio,
            composition: this.composition,
            interaction: this.interaction,
            safety: this.safety,
        });
        this.isInitialized = false;
    }
}
