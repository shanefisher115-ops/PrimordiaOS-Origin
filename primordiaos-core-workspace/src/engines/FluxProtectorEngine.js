import * as THREE from 'three';

export class FluxProtectorEngine {
    constructor(scene, particleCount = 5000) {
        this.scene = scene;
        this.particleCount = particleCount;
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.06,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        this.initParticles();
    }

    initParticles() {
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            const radius = 2.5 + Math.random() * 4.5;
            const theta = Math.random() * Math.PI * 2;
            
            // Initial accretion disk ring position
            positions[i * 3]     = Math.cos(theta) * radius; // X
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1; // Y (Thin disk)
            positions[i * 3 + 2] = Math.sin(theta) * radius; // Z

            // Orbital Keplerian velocities
            const vK = Math.sqrt(12.0 / radius);
            velocities[i * 3]     = -Math.sin(theta) * vK;
            velocities[i * 3 + 1] = 0;
            velocities[i * 3 + 2] =  Math.cos(theta) * vK;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.velocities = velocities;
        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);
    }

    update(dt) {
        const positions = this.geometry.attributes.position.array;
        const vel = this.velocities;

        for (let i = 0; i < this.particleCount; i++) {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];

            let vx = vel[i * 3];
            let vy = vel[i * 3 + 1];
            let vz = vel[i * 3 + 2];

            let r2 = x * x + z * z;
            let r = Math.sqrt(r2);

            // 1. Gravitational pull toward central singularity
            let F_grav_x = -x / (r2 * r + 0.1) * 15.0;
            let F_grav_z = -z / (r2 * r + 0.1) * 15.0;

            // 2. Magnetic Field Vector B (Toroidal + Poloidal funnel)
            // As r drops, magnetic flux compression increases B exponentially (Flux Freezing)
            let B_mag = 2.5 / (r2 + 0.4); 
            
            // Magnetic Pressure Gradient Force (-grad(B^2 / 2)) pushing outward & upward
            let F_mag_press = B_mag * B_mag * 4.0;
            let fx_press = (x / r) * F_mag_press;
            let fz_press = (z / r) * F_mag_press;

            // 3. Lorentz Force Vector Cross Product approximation: F_L = v x B
            // Channels rotational momentum into vertical polar jet acceleration
            let f_jet_y = (Math.abs(x) + Math.abs(z)) < 1.8 ? Math.sign(y || 0.1) * B_mag * 8.0 : -y * 0.5;

            // Net Acceleration (F = m*a, assuming m=1)
            let ax = F_grav_x + fx_press - vx * 0.1; // Plasma drag damping
            let ay = f_jet_y - vy * 0.2;
            let az = F_grav_z + fz_press - vz * 0.1;

            // Velocity Integration (Verlet / Euler step)
            vx += ax * dt;
            vy += ay * dt;
            vz += az * dt;

            vel[i * 3]     = vx;
            vel[i * 3 + 1] = vy;
            vel[i * 3 + 2] = vz;

            // Position Integration
            positions[i * 3]     += vx * dt;
            positions[i * 3 + 1] += vy * dt;
            positions[i * 3 + 2] += vz * dt;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
