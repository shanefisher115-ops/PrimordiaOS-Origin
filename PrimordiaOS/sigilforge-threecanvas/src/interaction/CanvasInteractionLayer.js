import * as THREE from 'three';
import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';
export class CanvasInteractionLayer {
    logger = new SigilForgeLogger('InteractionLayer');
    targetElement = null;
    rawPointer = new THREE.Vector2(0, 0);
    smoothedPointer = new THREE.Vector2(0, 0);
    isHovered = false;
    isPressed = false;
    shockwaveListeners = new Set();
    panelToggleListeners = new Set();
    panelStates = new Map();
    lerpSpeed = 6.0;
    constructor() {
        this.logger.info('CanvasInteractionLayer initialized');
    }
    bind(element) {
        this.targetElement = element;
        element.addEventListener('pointermove', this.handlePointerMove, { passive: true });
        element.addEventListener('pointerenter', this.handlePointerEnter, { passive: true });
        element.addEventListener('pointerleave', this.handlePointerLeave, { passive: true });
        element.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
        element.addEventListener('pointerup', this.handlePointerUp, { passive: true });
        this.logger.debug('Bound pointer event listeners to canvas container');
    }
    unbind() {
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
    handlePointerMove = (e) => {
        if (!this.targetElement)
            return;
        const rect = this.targetElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        this.rawPointer.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    };
    handlePointerEnter = () => {
        this.isHovered = true;
    };
    handlePointerLeave = () => {
        this.isHovered = false;
        this.rawPointer.set(0, 0);
    };
    handlePointerDown = (e) => {
        this.isPressed = true;
        if (!this.targetElement)
            return;
        const rect = this.targetElement.getBoundingClientRect();
        const uvX = (e.clientX - rect.left) / rect.width;
        const uvY = 1.0 - (e.clientY - rect.top) / rect.height;
        this.triggerShockwave(uvX, uvY);
    };
    handlePointerUp = () => {
        this.isPressed = false;
    };
    triggerShockwave(x, y) {
        this.logger.debug(`Triggering click shockwave at (${x.toFixed(2)}, ${y.toFixed(2)})`);
        for (const listener of this.shockwaveListeners) {
            try {
                listener(x, y);
            }
            catch (err) {
                this.logger.error('Error invoking shockwave listener', err);
            }
        }
    }
    onShockwave(callback) {
        this.shockwaveListeners.add(callback);
        return () => this.shockwaveListeners.delete(callback);
    }
    onPanelToggle(callback) {
        this.panelToggleListeners.add(callback);
        return () => this.panelToggleListeners.delete(callback);
    }
    togglePanel(panelId) {
        const currentState = this.panelStates.get(panelId) || false;
        const newState = !currentState;
        this.panelStates.set(panelId, newState);
        for (const listener of this.panelToggleListeners) {
            try {
                listener(panelId, newState);
            }
            catch (err) {
                this.logger.error('Error in panelToggle listener', err);
            }
        }
        this.logger.info(`Panel '${panelId}' toggled to: ${newState}`);
        return newState;
    }
    isPanelOpen(panelId) {
        return this.panelStates.get(panelId) || false;
    }
    update(deltaTime) {
        // Smooth lerp pointer coordinates for camera parallax and specular flare inertia
        const factor = 1.0 - Math.exp(-this.lerpSpeed * deltaTime);
        this.smoothedPointer.lerp(this.rawPointer, factor);
    }
    getPointer() {
        return this.rawPointer;
    }
    getSmoothedPointer() {
        return this.smoothedPointer;
    }
    getIsHovered() {
        return this.isHovered;
    }
    getIsPressed() {
        return this.isPressed;
    }
}
