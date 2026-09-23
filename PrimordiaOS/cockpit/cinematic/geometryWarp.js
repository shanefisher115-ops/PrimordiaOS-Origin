export class GeometryWarp {
    computeFovDistortion(speedRatio) {
        return 75 * (1 + 0.3 * speedRatio);
    }
}
