import * as THREE from 'three';

export interface CosmicFieldShaderUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uBass: { value: number };
  uMid: { value: number };
  uTreble: { value: number };
  uPaletteOffset: { value: number };
}

export const CosmicFieldVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

export const CosmicFieldFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  uniform float uPaletteOffset;

  varying vec2 vUv;

  // Simple pseudo-random hash
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // 2D Value Noise
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractional Brownian Motion for cosmic gas filaments
  float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      val += amp * noise2D(p);
      p = rot * p * 2.0 + vec2(uTime * 0.02);
      amp *= 0.5;
    }
    return val;
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    uv.x *= aspect;

    // Cosmic void background gradient
    float dist = length(uv);
    vec3 voidCol = vec3(0.015, 0.008, 0.04) * (1.0 - dist * 0.4);

    // Multi-octave nebula filaments
    vec2 nebulaCoord = uv * 1.5 + vec2(sin(uTime * 0.05), cos(uTime * 0.04)) * 0.3;
    float nebula1 = fbm(nebulaCoord);
    float nebula2 = fbm(nebulaCoord * 1.8 + vec2(2.5, 1.2));

    // Audio-reactive nebula colors
    vec3 col1 = vec3(0.18, 0.05, 0.45) * (1.0 + uBass * 0.7);
    vec3 col2 = vec3(0.05, 0.35, 0.55) * (1.0 + uMid * 0.8);
    vec3 col3 = vec3(0.55, 0.15, 0.35) * (1.0 + uTreble * 0.9);

    vec3 nebulaColor = mix(col1, col2, nebula1) + col3 * pow(nebula2, 2.2);

    // Starfield generation
    vec2 starGrid = floor(uv * 40.0);
    vec2 starLocal = fract(uv * 40.0) - 0.5;
    float starRand = hash21(starGrid);
    float star = 0.0;
    if (starRand > 0.92) {
      float starDist = length(starLocal);
      float twinkle = sin(uTime * 4.0 + starRand * 6.28) * 0.4 + 0.6;
      star = exp(-pow(starDist * 18.0, 2.0)) * twinkle * (1.0 + uTreble * 0.6);
    }

    vec3 finalColor = voidCol + nebulaColor * 0.75 + vec3(star);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function createCosmicFieldShaderMaterial(): THREE.ShaderMaterial {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const uniforms: CosmicFieldShaderUniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uPaletteOffset: { value: 0 },
  };

  return new THREE.ShaderMaterial({
    vertexShader: CosmicFieldVertexShader,
    fragmentShader: CosmicFieldFragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}
