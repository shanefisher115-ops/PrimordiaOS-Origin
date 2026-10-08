import * as THREE from 'three';
import { initPrimordiaEngine } from './engine/core.js';
import { createHudPanel } from './components/hud.js';

// 1. Mount Engine Viewport
const container = document.getElementById('viewport');
const { scene, camera, renderer, composer } = initPrimordiaEngine(container);

// 2. Construct the Central Golden Accumulator & Light Pillar
const coreGroup = new THREE.Group();

// Tiered Golden Rings
const ringGeom = new THREE.TorusGeometry(3, 0.15, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd700, 
    emissive: 0xffaa00, 
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.9 
});

for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = (i - 2) * 0.8;
    ring.rotation.x = Math.PI / 2;
    coreGroup.add(ring);
}

// Vertical Plasma Light Pillar
const pillarGeom = new THREE.CylinderGeometry(0.3, 0.3, 25, 32);
const pillarMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.9 
});
const pillar = new THREE.Mesh(pillarGeom, pillarMat);
pillar.position.y = 10;
coreGroup.add(pillar);

scene.add(coreGroup);

// Add Ambient Light & Grid
const ambientLight = new THREE.AmbientLight(0x05080f, 2);
scene.add(ambientLight);

const gridHelper = new THREE.GridHelper(50, 50, 0x00f0ff, 0x112233);
gridHelper.position.y = -4;
scene.add(gridHelper);

// 3. Mount Glassmorphism HUD Overlays
const uiLayer = document.getElementById('ui-layer');
const hudPanel = createHudPanel('PrimordiaOS Kernel [Active]', { stability: '99.998%', load: '18%' });
hudPanel.style.top = '40px';
hudPanel.style.right = '40px';
uiLayer.appendChild(hudPanel);

// 4. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    coreGroup.rotation.y += 0.005;
    composer.render();
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
});
