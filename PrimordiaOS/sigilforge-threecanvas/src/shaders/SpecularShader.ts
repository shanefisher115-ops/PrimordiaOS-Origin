import * as THREE from 'three';

export interface SpecularShaderUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uPointer: { value: THREE.Vector2 };
  uGlareIntensity: { value: number };
  uLightColor: { value: THREE.Color };
  uAudioEnergy: { value: number };
}

export const SpecularVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const SpecularFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uGlareIntensity;
  uniform vec3 uLightColor;
  uniform float uAudioEnergy;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec2 uv = vUv;
    vec2 pointerUv = (uPointer + 1.0) * 0.5;

    // Specular light point calculation
    float dist = distance(uv, pointerUv);
    float coreGlare = exp(-pow(dist * 6.0, 2.0));
    float haloGlare = exp(-pow(dist * 2.2, 2.0)) * 0.4;
    float crossStreak1 = exp(-abs(uv.x - pointerUv.x) * 60.0) * exp(-abs(uv.y - pointerUv.y) * 4.0);
    float crossStreak2 = exp(-abs(uv.y - pointerUv.y) * 60.0) * exp(-abs(uv.x - pointerUv.x) * 4.0);

    float totalGlare = coreGlare + haloGlare + (crossStreak1 + crossStreak2) * 0.35;
    totalGlare *= (1.0 + uAudioEnergy * 0.8) * uGlareIntensity;

    // Chromatic aberration at the glare perimeter
    vec3 glareCol;
    glareCol.r = totalGlare * exp(-pow((dist - 0.05) * 8.0, 2.0));
    glareCol.g = totalGlare;
    glareCol.b = totalGlare * exp(-pow((dist + 0.05) * 8.0, 2.0));

    vec3 finalColor = uLightColor * glareCol;
    float alpha = clamp(totalGlare, 0.0, 1.0);

    if (alpha < 0.005) {
      discard;
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function createSpecularShaderMaterial(): THREE.ShaderMaterial {
  const uniforms: SpecularShaderUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uGlareIntensity: { value: 1.0 },
    uLightColor: { value: new THREE.Color(0.85, 0.95, 1.0) },
    uAudioEnergy: { value: 0 },
  };

  return new THREE.ShaderMaterial({
    vertexShader: SpecularVertexShader,
    fragmentShader: SpecularFragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}
