export class GeometryWarp {
  computeFovDistortion(speedRatio: number): number {
    return 75 * (1 + 0.3 * speedRatio);
  }
}