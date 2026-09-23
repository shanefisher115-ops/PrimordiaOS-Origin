import * as THREE from 'three';

export interface CameraOptions {
  fov?: number;
  near?: number;
  far?: number;
  initialZ?: number;
}

export class ThreeCamera {
  private camera: THREE.PerspectiveCamera;
  private basePosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;

  constructor(width: number, height: number, options: CameraOptions = {}) {
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

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public updateAspect(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  public setParallaxOffset(offsetX: number, offsetY: number, intensity: number = 0.5): void {
    this.targetPosition.x = this.basePosition.x + offsetX * intensity;
    this.targetPosition.y = this.basePosition.y + offsetY * intensity;
  }

  public update(lerpFactor: number = 0.05): void {
    this.camera.position.lerp(this.targetPosition, lerpFactor);
    this.camera.lookAt(0, 0, 0);
  }

  public reset(): void {
    this.targetPosition.copy(this.basePosition);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(0, 0, 0);
  }
}
