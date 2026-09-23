import * as THREE from 'three';
export const ParticleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uAmplitude;
  uniform float uBass;

  attribute float aScale;
  attribute float aPhase;
  attribute vec3 aVelocity;

  varying float vPhase;
  varying float vDist;

  void main() {
    vPhase = aPhase;
    vec3 pos = position;

    // Orbital twist and vortex displacement
    float angle = uTime * 0.2 * (1.0 + aVelocity.z) + aPhase;
    float cosA = cos(angle);
    float sinA = sin(angle);
    float x = pos.x * cosA - pos.y * sinA;
    float y = pos.x * sinA + pos.y * cosA;
    pos.x = x;
    pos.y = y;

    // Audio reactive expansion pulse
    pos += normalize(pos + 0.001) * (uBass * 1.8 + uAmplitude * 0.8) * sin(uTime * 3.0 + aPhase);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aScale * uPixelRatio * (280.0 / -mvPosition.z) * (1.0 + uBass * 0.6);
  }
`;
export const ParticleFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uAmplitude;

  varying float vPhase;
  varying float vDist;

  void main() {
    // Round particle sprite
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) {
      discard;
    }

    // Soft glow core
    float core = exp(-pow(dist * 5.0, 2.0));
    float halo = exp(-pow(dist * 2.5, 2.0)) * 0.5;
    float shimmer = sin(uTime * 5.0 + vPhase * 6.28) * 0.3 + 0.7;

    vec3 col = uColor * (core + halo) * shimmer * (1.0 + uAmplitude);
    float alpha = (core + halo * 0.6) * shimmer;

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;
export function createParticleShaderMaterial() {
    const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;
    const uniforms = {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uAmplitude: { value: 0 },
        uBass: { value: 0 },
        uColor: { value: new THREE.Color(0.3, 0.7, 1.0) },
    };
    return new THREE.ShaderMaterial({
        vertexShader: ParticleVertexShader,
        fragmentShader: ParticleFragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}
