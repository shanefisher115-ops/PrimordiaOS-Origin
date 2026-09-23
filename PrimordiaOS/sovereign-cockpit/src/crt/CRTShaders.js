/**
 * PrimordiaOS Sovereign Cockpit — CRT Shader Specifications & Math
 * Houses GLSL/WGSL shader code snippets, phosphor decay equations,
 * barrel distortion mathematics, and cosmic palette LUT matrices.
 */
export const DEFAULT_CRT_UNIFORMS = {
    time: 0.0,
    resolution: [1920, 1080],
    curvature: 0.18,
    scanlineIntensity: 0.35,
    phosphorPersistence: 0.92,
    noiseStrength: 0.04,
    vignetteStrength: 0.45,
    chromaticAberration: 0.0035,
    lut: 'Imperial Gold'
};
/**
 * GLSL Fragment Shader for WebGL / WebGPU raster pipelines
 */
export const CRT_FRAGMENT_SHADER_GLSL = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_curvature;
uniform float u_scanlineIntensity;
uniform float u_noiseStrength;
uniform float u_vignetteStrength;
uniform float u_chromaticAberration;
uniform int u_lutMode; // 0: Raw, 1: Imperial Gold, 2: Cyberpunk Emerald
uniform sampler2D u_screenTexture;

// Spherical barrel distortion
vec2 curveScreen(vec2 uv, float curvature) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(curvature, curvature);
  uv = uv + uv * offset * offset;
  uv = uv * 0.5 + 0.5;
  return uv;
}

// Pseudo-random Gaussian grain
float pseudoNoise(vec2 uv, float t) {
  return fract(sin(dot(uv + vec2(t * 0.1, t * 0.2), vec2(12.9898, 78.233))) * 43758.5453);
}

// Vignette calculation
float vignette(vec2 uv, float strength) {
  uv *= 1.0 - uv.yx;
  float vig = uv.x * uv.y * 15.0;
  return clamp(pow(vig, strength), 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 curvedUV = curveScreen(uv, 1.0 / max(u_curvature, 0.001));

  // Black border outside CRT curvature bounds
  if (curvedUV.x < 0.0 || curvedUV.x > 1.0 || curvedUV.y < 0.0 || curvedUV.y > 1.0) {
    gl_FragColor = vec4(0.01, 0.01, 0.01, 1.0);
    return;
  }

  // Chromatic Aberration RGB offsets
  float r = texture2D(u_screenTexture, curvedUV + vec2(u_chromaticAberration, 0.0)).r;
  float g = texture2D(u_screenTexture, curvedUV).g;
  float b = texture2D(u_screenTexture, curvedUV - vec2(u_chromaticAberration, 0.0)).b;
  vec3 color = vec3(r, g, b);

  // Scanline modulation
  float scanline = sin(curvedUV.y * u_resolution.y * 1.5) * 0.5 + 0.5;
  color *= 1.0 - (scanline * u_scanlineIntensity);

  // Noise injection
  float grain = (pseudoNoise(curvedUV, u_time) - 0.5) * u_noiseStrength;
  color += grain;

  // Vignette edge falloff
  color *= vignette(curvedUV, u_vignetteStrength);

  // Apply Sovereign Color LUT
  if (u_lutMode == 1) {
    // Imperial Gold: warm amber, golden luminescence, crushed blacks
    color = vec3(
      color.r * 1.35 + color.g * 0.15,
      color.g * 0.95 + color.r * 0.10,
      color.b * 0.45
    );
  } else if (u_lutMode == 2) {
    // Cyberpunk Emerald: neon cyan/green, high contrast
    color = vec3(
      color.r * 0.45,
      color.g * 1.40 + color.b * 0.20,
      color.b * 1.25 + color.g * 0.10
    );
  }

  gl_FragColor = vec4(color, 1.0);
}
`;
/**
 * Pure TypeScript mathematical utilities for software CRT rasterization
 */
export class CRTMath {
    /**
     * Evaluates barrel curvature for a 2D coordinate [0..1]
     */
    static calculateBarrelDistortion(x, y, curvature) {
        if (curvature <= 0)
            return [x, y];
        const nx = x * 2.0 - 1.0;
        const ny = y * 2.0 - 1.0;
        const r2 = nx * nx + ny * ny;
        const factor = 1.0 + curvature * r2;
        const curvedX = (nx * factor + 1.0) / 2.0;
        const curvedY = (ny * factor + 1.0) / 2.0;
        return [curvedX, curvedY];
    }
    /**
     * P22 Phosphor luminescence decay equation:
     * I(t) = I_0 * e^(-t / tau)
     */
    static calculatePhosphorDecay(initialLuminance, deltaSeconds, tau = 0.08) {
        return initialLuminance * Math.exp(-deltaSeconds / tau);
    }
    /**
     * Transform raw RGB color with Sovereign LUT Matrix
     */
    static applyLUT(r, g, b, lut) {
        switch (lut) {
            case 'Imperial Gold':
                return [
                    Math.min(255, Math.round(r * 1.35 + g * 0.15)),
                    Math.min(255, Math.round(g * 0.95 + r * 0.10)),
                    Math.min(255, Math.round(b * 0.45))
                ];
            case 'Cyberpunk Emerald':
                return [
                    Math.min(255, Math.round(r * 0.45)),
                    Math.min(255, Math.round(g * 1.40 + b * 0.20)),
                    Math.min(255, Math.round(b * 1.25 + g * 0.10))
                ];
            case 'Neutral Raw':
            default:
                return [r, g, b];
        }
    }
}
