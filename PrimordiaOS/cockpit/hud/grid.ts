export class SpatialGrid {
  private resolution: number = 64;
  private horizonPitch: number = 0.0;

  projectCoordinates(x: number, y: number, z: number) {
    const fov = 75;
    const factor = fov / (fov + z);
    return {
      screenX: x * factor,
      screenY: y * factor,
      scale: factor
    };
  }

  getGridMatrix() {
    return {
      lines: this.resolution,
      pitch: this.horizonPitch,
      sphericalCurvature: 0.12
    };
  }
}