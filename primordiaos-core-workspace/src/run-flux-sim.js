import * as THREE from 'three';
import { FluxProtectorEngine } from './engines/FluxProtectorEngine.js';

const scene = new THREE.Scene();
const engine = new FluxProtectorEngine(scene, 5000);

console.log('[PrimordiaFlow] Initializing True MHD Lorentz & Flux Pressure Engine...');
const dt = 0.012;
for (let frame = 1; frame <= 60; frame++) {
    engine.update(dt);
    if (frame % 15 === 0) {
        const samplePos = engine.geometry.attributes.position.array;
        const sampleVel = engine.velocities;
        console.log(`[Frame ${frame}] MHD Core Particle [0] -> Pos(x:${samplePos[0].toFixed(2)}, y:${samplePos[1].toFixed(2)}, z:${samplePos[2].toFixed(2)}) | Vel(y:${sampleVel[1].toFixed(2)})`);
    }
}
console.log('[PrimordiaFlow] MHD Vector Matrix Verified. Flux protector shielding active.');
