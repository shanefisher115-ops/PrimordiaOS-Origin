export class NavigatorAgent {
    bus;
    constructor(bus) {
        this.bus = bus;
    }
    plotCourseToOrigin() {
        this.bus.dispatchMessage("navigator", "Course plotted to Chamber of Origin. Coordinates locked.");
    }
}
