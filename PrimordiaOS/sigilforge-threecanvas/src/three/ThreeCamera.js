import * as THREE from 'three';
export class ThreeCamera {
    camera;
    basePosition;
    targetPosition;
    constructor(width, height, options = {}) {
        const fov = options.fov ?? 45;
        const near = options.near ?? 0.1;
        const far = options.far ?? 1000;
        const initialZ = options.initialZ ?? 5.0;
        const aspect = width / Math.max(height, 1);
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.basePosition = new THREE.Vector3(0, 0, initialZ);
        this.targetPosition = this.basePosition.clone();
        this.camera.position.copy(this.basePosition);
        this.camera.lookAt(0, 0, 0);
    }
    getCamera() {
        return this.camera;
    }
    updateAspect(width, height) {
        this.camera.aspect = width / Math.max(height, 1);
        this.camera.updateProjectionMatrix();
    }
    setParallaxOffset(offsetX, offsetY, intensity = 0.5) {
        this.targetPosition.x = this.basePosition.x + offsetX * intensity;
        this.targetPosition.y = this.basePosition.y + offsetY * intensity;
    }
    update(lerpFactor = 0.05) {
        this.camera.position.lerp(this.targetPosition, lerpFactor);
        this.camera.lookAt(0, 0, 0);
    }
    reset() {
        this.targetPosition.copy(this.basePosition);
        this.camera.position.copy(this.basePosition);
        this.camera.lookAt(0, 0, 0);
    }
}
