// components/RealmGate.js - Spatial Realm Portal Rings with Animated Transitions
import * as THREE from "three";

export function createRealmGate(name, position, options = {}) {
  const {
    color = 0x00ffff,
    onTrigger = null
  } = options;

  const group = new THREE.Group();
  group.position.copy(position);
  group.userData = { isRealmGate: true, realm: name, active: false };

  // Outer Portal Ring
  const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });
  const gate = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(gate);

  // Inner Energy Vortex Ring
  const innerGeo = new THREE.RingGeometry(0.65, 0.78, 48);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    wireframe: true,
    side: THREE.DoubleSide
  });
  const innerRing = new THREE.Mesh(innerGeo, innerMat);
  group.add(innerRing);

  // Swirling Core Particles
  const particleCount = 40;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.35;
    pPositions[i * 3] = Math.cos(angle) * radius;
    pPositions[i * 3 + 1] = Math.sin(angle) * radius;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: color,
    size: 0.04,
    transparent: true,
    opacity: 0.8
  });
  const particles = new THREE.Points(pGeo, pMat);
  group.add(particles);

  // Holographic Text Label
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 384;
  labelCanvas.height = 96;
  const lctx = labelCanvas.getContext("2d");
  
  lctx.fillStyle = "rgba(2, 6, 23, 0.75)";
  lctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
  lctx.strokeStyle = "#00ffff";
  lctx.strokeRect(4, 4, labelCanvas.width - 8, labelCanvas.height - 8);
  lctx.font = "bold 24px 'Courier New', monospace";
  lctx.fillStyle = "#ffffff";
  lctx.textAlign = "center";
  lctx.fillText(name.toUpperCase(), labelCanvas.width / 2, 42);
  lctx.font = "14px 'Courier New', monospace";
  lctx.fillStyle = "#00ffff";
  lctx.fillText("REALM GATE [ACTIVATE]", labelCanvas.width / 2, 70);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshBasicMaterial({
    map: labelTex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), labelMat);
  labelMesh.position.set(0, -1.15, 0);
  group.add(labelMesh);

  // Transition state
  let transitionProgress = 0;
  let isTransitioning = false;

  group.trigger = function () {
    if (isTransitioning) return;
    isTransitioning = true;
    transitionProgress = 0;
    ringMaterial.opacity = 1.0;
    innerMat.opacity = 0.9;
    
    if (typeof onTrigger === "function") {
      onTrigger(name);
    }
  };

  group.update = function (delta, elapsed) {
    // Idle rotation
    gate.rotation.z += delta * 0.4;
    innerRing.rotation.z -= delta * 0.8;
    particles.rotation.z += delta * 1.2;

    // Subtle pulse
    const pulse = 1.0 + Math.sin(elapsed * 2.0) * 0.04;
    group.scale.set(pulse, pulse, 1.0);

    // Transition effect
    if (isTransitioning) {
      transitionProgress += delta * 2.5;
      const scaleWarp = 1.0 + Math.sin(transitionProgress * Math.PI) * 0.35;
      group.scale.set(scaleWarp, scaleWarp, scaleWarp);

      if (transitionProgress >= 1.0) {
        isTransitioning = false;
        ringMaterial.opacity = 0.55;
        innerMat.opacity = 0.35;
      }
    }
  };

  return group;
}
