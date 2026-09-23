import * as THREE from 'three';

export interface FoilShaderUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uBass: { value: number };
  uMid: { value: number };
  uTreble: { value: number };
  uHueShift: { value: number };
  uFoilIntensity: { value: number };
  uShockwaveCenter: { value: THREE.Vector2 };
  uShockwaveProgress: { value: number };
  uTexture: { value: THREE.Texture | null };
}

export const FoilVertexShader = /* glsl */ `
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

export const FoilFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uHueShift;
  uniform float uFoilIntensity;
  uniform vec2 uShockwaveCenter;
  uniform float uShockwaveProgress;
  uniform sampler2D uTexture;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Cosine-based spectral palette generator
  vec3 spectralPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d + uHueShift));
  }

  void main() {
    vec2 uv = vUv;

    // Apply interactive shockwave ripple
    if (uShockwaveProgress > 0.0 && uShockwaveProgress < 1.0) {
      vec2 dir = uv - uShockwaveCenter;
      float dist = length(dir);
      float waveDist = uShockwaveProgress;
      float diff = dist - waveDist;
      float wave = exp(-pow(diff * 25.0, 2.0));
      float shockAmp = 0.04 * (1.0 - uShockwaveProgress);
      uv += normalize(dir + 0.0001) * wave * shockAmp;
    }

    vec4 texColor = texture2D(uTexture, uv);
    if (texColor.a < 0.02) {
      discard;
    }

    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    float NdotV = max(dot(normal, viewDir), 0.0);

    // Thin-film holographic interference simulation
    float fresnel = pow(1.0 - NdotV, 3.0);
    float angleShift = dot(viewDir, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    float phase = uv.x * 2.0 + uv.y * 3.0 + uTime * 0.2 + angleShift + uBass * 0.4;
    vec3 iridescence = spectralPalette(phase);

    // Micro-groove diffraction grating effect
    float grating = sin(uv.y * 400.0 + uv.x * 200.0 + uTime * 0.5) * 0.5 + 0.5;
    vec3 foilColor = mix(iridescence, vec3(1.0), grating * 0.25 * uFoilIntensity);

    // Audio reactive pulse modulation
    foilColor += vec3(0.15, 0.25, 0.4) * uBass * 0.6;
    foilColor += vec3(0.3, 0.1, 0.35) * uTreble * 0.4;

    // Composite foil over base texture
    vec3 finalColor = mix(texColor.rgb, foilColor, (fresnel * 0.7 + 0.3) * uFoilIntensity);
    float finalAlpha = texColor.a;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

export function createFoilShaderMaterial(texture?: THREE.Texture): THREE.ShaderMaterial {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const uniforms: FoilShaderUniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uHueShift: { value: 0 },
    uFoilIntensity: { value: 1.0 },
    uShockwaveCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uShockwaveProgress: { value: 0 },
    uTexture: { value: texture || null },
  };

  return new THREE.ShaderMaterial({
    vertexShader: FoilVertexShader,
    fragmentShader: FoilFragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}
