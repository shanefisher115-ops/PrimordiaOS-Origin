/**
 * PrimordiaOS Sovereign Cockpit — Cosmic Particle Field Simulation
 * Implements n-body cosmic starfield physics, Brownian motion, gravitational
 * attractors towards active UI panels, and audio-reactive particle bursts.
 */
export class CosmicField {
    particles = [];
    maxParticles;
    fieldBounds;
    attractors = [];
    constructor(maxParticles = 300) {
        this.maxParticles = maxParticles;
        this.fieldBounds = {
            min: { x: -800, y: -500, z: -200 },
            max: { x: 800, y: 500, z: 600 }
        };
        this.seedField();
    }
    setAttractors(attractors) {
        this.attractors = attractors;
    }
    /**
     * Ticks particle physics, gravitational pull, and audio reactivity.
     */
    update(deltaSeconds, audioPulse = { bassLevel: 0, trebleLevel: 0 }) {
        // 1. Audio Bass impulse trigger
        const bassBurst = audioPulse.bassLevel > 0.7 ? (audioPulse.bassLevel - 0.7) * 40.0 : 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            // Update age
            p.lifespan -= deltaSeconds;
            if (p.lifespan <= 0) {
                this.reincarnateParticle(p);
                continue;
            }
            // Gravitational attraction towards active holographic panel positions
            if (this.attractors.length > 0) {
                const attractor = this.attractors[i % this.attractors.length];
                const dx = attractor.x - p.position.x;
                const dy = attractor.y - p.position.y;
                const dz = attractor.z - p.position.z;
                const distSq = dx * dx + dy * dy + dz * dz + 100.0; // avoid div by 0
                const force = 150.0 / distSq;
                p.velocity.x += dx * force * deltaSeconds;
                p.velocity.y += dy * force * deltaSeconds;
                p.velocity.z += dz * force * deltaSeconds;
            }
            // Audio-reactive bass explosion outwards from center
            if (bassBurst > 0) {
                const len = Math.sqrt(p.position.x * p.position.x + p.position.y * p.position.y + p.position.z * p.position.z) + 0.001;
                p.velocity.x += (p.position.x / len) * bassBurst;
                p.velocity.y += (p.position.y / len) * bassBurst;
                p.velocity.z += (p.position.z / len) * bassBurst;
            }
            // Position update
            p.position.x += p.velocity.x * deltaSeconds;
            p.position.y += p.velocity.y * deltaSeconds;
            p.position.z += p.velocity.z * deltaSeconds;
            // Damping / Friction
            p.velocity.x *= 0.985;
            p.velocity.y *= 0.985;
            p.velocity.z *= 0.985;
            // Luminance shimmer modified by audio treble
            const shimmer = (Math.random() - 0.5) * 0.1 * (1.0 + audioPulse.trebleLevel * 2.0);
            const lifeRatio = p.lifespan / p.maxLifespan;
            p.luminance = Math.min(1.0, Math.max(0.0, Math.sin(lifeRatio * Math.PI) + shimmer));
        }
    }
    getParticles() {
        return this.particles;
    }
    seedField() {
        this.particles = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(this.createRandomParticle(i));
        }
    }
    createRandomParticle(id) {
        const lifespan = 4 + Math.random() * 8;
        return {
            id,
            position: {
                x: this.fieldBounds.min.x + Math.random() * (this.fieldBounds.max.x - this.fieldBounds.min.x),
                y: this.fieldBounds.min.y + Math.random() * (this.fieldBounds.max.y - this.fieldBounds.min.y),
                z: this.fieldBounds.min.z + Math.random() * (this.fieldBounds.max.z - this.fieldBounds.min.z)
            },
            velocity: {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 20
            },
            luminance: Math.random(),
            size: 1 + Math.random() * 2.5,
            colorHex: this.getRandomCosmicColor(),
            lifespan,
            maxLifespan: lifespan
        };
    }
    reincarnateParticle(p) {
        p.lifespan = 4 + Math.random() * 8;
        p.maxLifespan = p.lifespan;
        p.position.x = this.fieldBounds.min.x + Math.random() * (this.fieldBounds.max.x - this.fieldBounds.min.x);
        p.position.y = this.fieldBounds.min.y + Math.random() * (this.fieldBounds.max.y - this.fieldBounds.min.y);
        p.position.z = this.fieldBounds.min.z + Math.random() * (this.fieldBounds.max.z - this.fieldBounds.min.z);
        p.velocity.x = (Math.random() - 0.5) * 20;
        p.velocity.y = (Math.random() - 0.5) * 20;
        p.velocity.z = (Math.random() - 0.5) * 20;
        p.colorHex = this.getRandomCosmicColor();
    }
    getRandomCosmicColor() {
        const palettes = ['#F5B700', '#00F0FF', '#7000FF', '#FF0055', '#00FF66'];
        return palettes[Math.floor(Math.random() * palettes.length)];
    }
}
