export class HelmRing {
  private heading: number = 342.5;
  private inclination: number = 12.8;

  getOrientation() {
    return {
      heading: this.heading,
      inclination: this.inclination,
      compassBearing: "NNW"
    };
  }

  adjustHeading(delta: number): void {
    this.heading = (this.heading + delta + 360) % 360;
  }
}