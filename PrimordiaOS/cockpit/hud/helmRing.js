export class HelmRing {
    heading = 342.5;
    inclination = 12.8;
    getOrientation() {
        return {
            heading: this.heading,
            inclination: this.inclination,
            compassBearing: "NNW"
        };
    }
    adjustHeading(delta) {
        this.heading = (this.heading + delta + 360) % 360;
    }
}
