// AssetStage: one Primordia-cad piece on a lit three.js stage. Shared by the headless previewer
// (preview/render.html, turntable thumbnails for the judge and the catalog) and the review gallery
// (interactive viewer). Browser ES module; "three" comes from the page's import map.
//
// Materials are assigned by glTF material (= kernel slot) name: Stone / Glass / Iron get the genre pack's
// looks. Lighting comes from the pack's preset (Primordia-cad/genres/lighting.ts). Renderer settings follow
// sigilforge-threecanvas's ThreeRenderer (ACES tone mapping, sRGB output, preserveDrawingBuffer for capture).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const srgb = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
const deg = (d) => (d * Math.PI) / 180;

/** Kernel frame (Z up, azimuth from +X towards +Y) to three's Y-up frame, as the glTF export maps it. */
function lightDirection(azimuth, elevation) {
  const ce = Math.cos(deg(elevation));
  return new THREE.Vector3(ce * Math.cos(deg(azimuth)), Math.sin(deg(elevation)), -ce * Math.sin(deg(azimuth)));
}

function gradientTexture(bg) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  const css = (v) => `rgb(${v.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255)).join(',')})`;
  grad.addColorStop(0, css(bg.top));
  grad.addColorStop(0.62, css(bg.horizon));
  grad.addColorStop(0.7, css(bg.horizon.map((x, i) => (x + bg.bottom[i]) / 2)));
  grad.addColorStop(1, css(bg.bottom));
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function contactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function slotMaterial(look, preset) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(look.color[0], look.color[1], look.color[2]), // linear, like glTF baseColorFactor
    roughness: look.roughness,
    metalness: look.metalness,
  });
  if (look.emissive) {
    m.emissive = new THREE.Color(look.emissive[0], look.emissive[1], look.emissive[2]);
    m.emissiveIntensity = (look.emissiveIntensity ?? 1) * (preset?.emissiveBoost ?? 1);
  }
  if (look.opacity !== undefined && look.opacity < 1) { m.transparent = true; m.opacity = look.opacity; m.depthWrite = false; }
  return m;
}

export class AssetStage {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ width: number, height: number, pixelRatio?: number, preserve?: boolean }} opts
   */
  constructor(canvas, { width, height, pixelRatio = 1, preserve = false }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, width / height, 0.05, 5000);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.pivot = new THREE.Group(); // turntable: the asset turns, the lights stay
    this.scene.add(this.pivot);
    this.lights = new THREE.Group();
    this.scene.add(this.lights);
    this.loader = new GLTFLoader();
    this.asset = null;
    this.target = new THREE.Vector3();
    this.radius = 1;
  }

  setSize(width, height) {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Lighting preset + background for a genre pack (packData from Primordia-cad/genres). */
  setLook(pack) {
    this.pack = pack;
    const p = pack.lightingPreset;
    this.renderer.toneMappingExposure = p.exposure;
    this.scene.environmentIntensity = p.environment;
    this.scene.background?.dispose?.();
    this.scene.background = gradientTexture(p.background);
    this.lights.clear();
    this.lights.add(new THREE.HemisphereLight(srgb(p.hemisphere.sky), srgb(p.hemisphere.ground), p.hemisphere.intensity));
    for (const l of [p.key, p.rim]) {
      const d = new THREE.DirectionalLight(srgb(l.color), l.intensity);
      d.position.copy(lightDirection(l.azimuth, l.elevation).multiplyScalar(100));
      this.lights.add(d);
    }
    if (this.asset) this.#applySlots(this.asset);
  }

  #applySlots(root) {
    const looks = this.pack?.slots ?? {};
    root.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.material?.name || 'Stone';
      const look = looks[name] ?? looks.Stone;
      if (!look) return;
      o.material?.dispose?.();
      o.material = slotMaterial(look, this.pack.lightingPreset);
    });
  }

  /** Shows a .glb (URL or ArrayBuffer). Resolves to the asset's size in metres [x, y, z] (three's Y up). */
  async load(source) {
    const gltf = typeof source === 'string'
      ? await this.loader.loadAsync(source)
      : await new Promise((res, rej) => this.loader.parse(source, '', res, rej));
    this.clearAsset();
    this.asset = gltf.scene;
    this.#applySlots(this.asset);
    const box = new THREE.Box3().setFromObject(this.asset);
    const center = box.getCenter(new THREE.Vector3());
    this.asset.position.set(-center.x, 0, -center.z); // turn about the vertical axis through the middle
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.add(this.asset);
    const size = box.getSize(new THREE.Vector3());
    this.radius = Math.max(0.05, 0.5 * size.length());
    this.target.set(0, size.y / 2, 0);
    const shadowR = 0.75 * Math.max(size.x, size.z) + 0.15 * size.y;
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 48),
      new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.002 * size.y;
    this.scene.add(this.shadow);
    this.frame();
    return [size.x, size.y, size.z];
  }

  clearAsset() {
    if (this.asset) {
      this.pivot.remove(this.asset);
      this.asset.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      this.asset = null;
    }
    if (this.shadow) {
      this.scene.remove(this.shadow);
      this.shadow.geometry.dispose(); this.shadow.material.map.dispose(); this.shadow.material.dispose();
      this.shadow = null;
    }
  }

  /** Puts the camera on a view that fits the whole piece: yaw from the front (-Y facade side), pitch looking down. */
  frame(yawDeg = 0, pitchDeg = 10) {
    const fov = deg(this.camera.fov);
    const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    const dist = (this.radius / Math.sin(fit / 2)) * 1.04;
    const dir = new THREE.Vector3(Math.sin(deg(yawDeg)) * Math.cos(deg(pitchDeg)), Math.sin(deg(pitchDeg)), Math.cos(deg(yawDeg)) * Math.cos(deg(pitchDeg)));
    this.camera.position.copy(this.target).addScaledVector(dir, dist);
    this.camera.near = Math.max(0.01, dist - 2 * this.radius);
    this.camera.far = dist + 4 * this.radius;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
    return dist;
  }

  /** Turns the asset (not the lights) to `yawDeg` and renders. */
  render(yawDeg = 0) {
    this.pivot.rotation.y = deg(yawDeg);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.clearAsset();
    this.scene.background?.dispose?.();
    this.scene.environment?.dispose?.();
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
