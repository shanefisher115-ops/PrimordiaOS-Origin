import * as THREE from 'three';
import { FluxProtectorEngine } from './engines/FluxProtectorEngine.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.025);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Ambient Light & Singularity Event Horizon Core
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const coreGeometry = new THREE.SphereGeometry(0.7, 32, 32);
const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
scene.add(coreMesh);

// Inner Accretion Glow Ring
const ringGeo = new THREE.RingGeometry(1.0, 2.0, 64);
const ringMat = new THREE.MeshBasicMaterial({ 
    color: 0xff5500, 
    side: THREE.DoubleSide, 
    transparent: true, 
    opacity: 0.8 
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
scene.add(ring);

// Mount Flux Protector Engine (8000 particle plasma matrix)
const engine = new FluxProtectorEngine(scene, 8000);

// Render Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    engine.update(dt);
    ring.rotation.z += dt * 0.4;

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
