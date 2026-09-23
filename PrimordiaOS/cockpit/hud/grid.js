export class SpatialGrid {
    resolution = 64;
    horizonPitch = 0.0;
    projectCoordinates(x, y, z) {
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
