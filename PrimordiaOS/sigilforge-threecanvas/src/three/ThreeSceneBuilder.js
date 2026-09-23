import * as THREE from 'three';
import { createCosmicFieldShaderMaterial } from '../shaders/CosmicFieldShader.js';
import { createParticleShaderMaterial } from '../shaders/ParticleShader.js';
import { createFoilShaderMaterial } from '../shaders/FoilShader.js';
import { createSpecularShaderMaterial } from '../shaders/SpecularShader.js';
export class ThreeSceneBuilder {
    scene;
    cosmicBackgroundMesh;
    particlePoints;
    foilMesh;
    specularMesh;
    sigilGroup;
    cosmicMaterial;
    particleMaterial;
    foilMaterial;
    specularMaterial;
    particleCount = 1200;
    shockwaveActive = false;
    shockwaveProgress = 0;
    constructor() {
        this.scene = new THREE.Scene();
        this.sigilGroup = new THREE.Group();
        this.scene.add(this.sigilGroup);
        this.buildCosmicBackground();
        this.buildParticleField();
        this.buildHolographicFoilPlane();
        this.buildSpecularGlareLayer();
        this.buildLighting();
    }
    getScene() {
        return this.scene;
    }
    getSigilGroup() {
        return this.sigilGroup;
    }
    getFoilMaterial() {
        return this.foilMaterial;
    }
    buildCosmicBackground() {
        const geometry = new THREE.PlaneGeometry(2, 2);
        this.cosmicMaterial = createCosmicFieldShaderMaterial();
        this.cosmicBackgroundMesh = new THREE.Mesh(geometry, this.cosmicMaterial);
        this.cosmicBackgroundMesh.frustumCulled = false;
        this.scene.add(this.cosmicBackgroundMesh);
    }
    buildParticleField() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const scales = new Float32Array(this.particleCount);
        const phases = new Float32Array(this.particleCount);
        const velocities = new Float32Array(this.particleCount * 3);
        for (let i = 0; i < this.particleCount; i++) {
            // Cylindrical / vortex distribution
            const radius = 0.8 + Math.random() * 2.8;
            const theta = Math.random() * Math.PI * 2;
            const z = (Math.random() - 0.5) * 2.0;
            positions[i * 3] = Math.cos(theta) * radius;
            positions[i * 3 + 1] = Math.sin(theta) * radius;
            positions[i * 3 + 2] = z;
            scales[i] = 0.5 + Math.random() * 1.5;
            phases[i] = Math.random();
            velocities[i * 3] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
        this.particleMaterial = createParticleShaderMaterial();
        this.particlePoints = new THREE.Points(geometry, this.particleMaterial);
        this.sigilGroup.add(this.particlePoints);
    }
    buildHolographicFoilPlane() {
        const geometry = new THREE.PlaneGeometry(2.4, 2.4, 32, 32);
        this.foilMaterial = createFoilShaderMaterial();
        this.foilMesh = new THREE.Mesh(geometry, this.foilMaterial);
        this.sigilGroup.add(this.foilMesh);
    }
    buildSpecularGlareLayer() {
        const geometry = new THREE.PlaneGeometry(2.6, 2.6);
        this.specularMaterial = createSpecularShaderMaterial();
        this.specularMesh = new THREE.Mesh(geometry, this.specularMaterial);
        this.specularMesh.position.z = 0.05;
        this.sigilGroup.add(this.specularMesh);
    }
    buildLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const pointLight = new THREE.PointLight(0x88ccff, 1.2, 10);
        pointLight.position.set(0, 0, 3);
        this.scene.add(ambientLight);
        this.scene.add(pointLight);
    }
    updateFoilTexture(texture) {
        if (this.foilMaterial && this.foilMaterial.uniforms.uTexture) {
            this.foilMaterial.uniforms.uTexture.value = texture;
            this.foilMaterial.needsUpdate = true;
        }
    }
    triggerShockwave(x, y) {
        this.shockwaveActive = true;
        this.shockwaveProgress = 0;
        if (this.foilMaterial && this.foilMaterial.uniforms.uShockwaveCenter) {
            this.foilMaterial.uniforms.uShockwaveCenter.value.set(x, y);
        }
    }
    update(deltaTime, elapsedTime, metrics, pointer) {
        // Update Cosmic Field Shader
        if (this.cosmicMaterial && this.cosmicMaterial.uniforms) {
            this.cosmicMaterial.uniforms.uTime.value = elapsedTime;
            this.cosmicMaterial.uniforms.uBass.value = metrics.bass;
            this.cosmicMaterial.uniforms.uMid.value = metrics.mid;
            this.cosmicMaterial.uniforms.uTreble.value = metrics.treble;
        }
        // Update Particle Shader
        if (this.particleMaterial && this.particleMaterial.uniforms) {
            this.particleMaterial.uniforms.uTime.value = elapsedTime;
            this.particleMaterial.uniforms.uAmplitude.value = metrics.amplitude;
            this.particleMaterial.uniforms.uBass.value = metrics.bass;
        }
        // Update Foil Shader
        if (this.foilMaterial && this.foilMaterial.uniforms) {
            this.foilMaterial.uniforms.uTime.value = elapsedTime;
            this.foilMaterial.uniforms.uBass.value = metrics.bass;
            this.foilMaterial.uniforms.uMid.value = metrics.mid;
            this.foilMaterial.uniforms.uTreble.value = metrics.treble;
            if (this.shockwaveActive) {
                this.shockwaveProgress += deltaTime * 1.5;
                if (this.shockwaveProgress >= 1.0) {
                    this.shockwaveActive = false;
                    this.shockwaveProgress = 0;
                }
                this.foilMaterial.uniforms.uShockwaveProgress.value = this.shockwaveProgress;
            }
        }
        // Update Specular Shader
        if (this.specularMaterial && this.specularMaterial.uniforms) {
            this.specularMaterial.uniforms.uTime.value = elapsedTime;
            this.specularMaterial.uniforms.uPointer.value.copy(pointer);
            this.specularMaterial.uniforms.uAudioEnergy.value = metrics.energy;
        }
        // Gentle sigil group floating tilt
        this.sigilGroup.rotation.z = Math.sin(elapsedTime * 0.3) * 0.05;
    }
    setResolution(width, height) {
        if (this.cosmicMaterial?.uniforms?.uResolution) {
            this.cosmicMaterial.uniforms.uResolution.value.set(width, height);
        }
        if (this.foilMaterial?.uniforms?.uResolution) {
            this.foilMaterial.uniforms.uResolution.value.set(width, height);
        }
    }
    dispose() {
        this.cosmicMaterial?.dispose();
        this.particleMaterial?.dispose();
        this.foilMaterial?.dispose();
        this.specularMaterial?.dispose();
        this.cosmicBackgroundMesh?.geometry.dispose();
        this.particlePoints?.geometry.dispose();
        this.foilMesh?.geometry.dispose();
        this.specularMesh?.geometry.dispose();
    }
}
