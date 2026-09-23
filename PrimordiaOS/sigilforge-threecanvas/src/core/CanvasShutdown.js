import { SigilForgeLogger } from '../logging/SigilForgeLogger.js';
export class CanvasShutdown {
    static logger = new SigilForgeLogger('CanvasShutdown');
    static execute(targets) {
        this.logger.info('Commencing full CanvasShutdown sequence...');
        // 1. Cancel active render loop
        if (targets.animFrameId !== undefined && targets.animFrameId !== null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(targets.animFrameId);
            this.logger.debug('Cancelled active animation frame');
        }
        // 2. Disconnect ResizeObserver
        if (targets.resizeObserver) {
            targets.resizeObserver.disconnect();
            this.logger.debug('Disconnected ResizeObserver');
        }
        // 3. Unbind interaction events
        if (targets.interaction) {
            targets.interaction.unbind();
            this.logger.debug('Unbound interaction listeners');
        }
        // 4. Dispose Audio context
        if (targets.audio) {
            targets.audio.dispose();
            this.logger.debug('Disposed AudioReactiveEngine');
        }
        // 5. Dispose composition textures & offscreen canvas
        if (targets.composition) {
            targets.composition.dispose();
            this.logger.debug('Disposed SigilCompositionEngine');
        }
        // 6. Purge tracked GPU resources & unbind safety canvas
        if (targets.safety) {
            targets.safety.unbindCanvas();
            targets.safety.purgeTrackedResources();
            this.logger.debug('Purged safety layer resources');
        }
        // 7. Dispose ThreeSceneBuilder geometries, materials, shaders
        if (targets.sceneBuilder) {
            targets.sceneBuilder.dispose();
            this.logger.debug('Disposed ThreeSceneBuilder');
        }
        // 8. Dispose WebGL renderer and remove canvas DOM if needed
        if (targets.renderer) {
            targets.renderer.dispose();
            this.logger.debug('Disposed ThreeRenderer');
        }
        this.logger.sovereign('CanvasShutdown complete. Memory clean.');
    }
}
