export class SwarmTrails {
    generateTrails(count) {
        return Array.from({ length: count }, (_, i) => ({
            trailId: "trail-" + i,
            length: 64,
            decayRate: 0.05
        }));
    }
}
