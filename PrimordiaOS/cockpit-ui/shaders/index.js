// shaders/index.js - JS-embedded shaders for direct ES module import compatibility

export const crtVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const crtFragmentShader = `
uniform float time;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Gentle barrel curvature
  vec2 centered = uv - 0.5;
  vec2 distortedUv = uv + centered * (dot(centered, centered) * 0.08);

  // Horizontal scanline oscillation
  float scan = sin(distortedUv.y * 800.0 + time * 10.0) * 0.04;
  
  // Center beam exponential phosphor bloom
  float glow = exp(-pow(distortedUv.y - 0.5, 2.0) * 20.0);

  // Texture sampling from dynamic terminal canvas
  vec4 texColor = texture2D(tDiffuse, distortedUv);

  // Phosphor color synthesis (Cosmic Teal / Sovereign Cyan tint)
  vec3 phosphorBase = vec3(0.08, 0.95, 0.78);
  vec3 color = texColor.rgb + (phosphorBase * (glow * 0.35 + scan * 0.5));
  
  // Screen edge vignette
  float vignette = smoothstep(0.75, 0.45, length(centered));
  color *= vignette;

  gl_FragColor = vec4(color, 0.96);
}
`;

export const holoVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const holoFragmentShader = `
uniform float time;
uniform sampler2D tDiffuse;
uniform vec3 rimColor;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Horizontal and vertical neon rim
  float edgeX = smoothstep(0.0, 0.04, uv.x) * smoothstep(1.0, 0.96, uv.x);
  float edgeY = smoothstep(0.0, 0.04, uv.y) * smoothstep(1.0, 0.96, uv.y);
  float border = 1.0 - (edgeX * edgeY);

  // Holographic scan wave
  float scanWave = sin(uv.y * 120.0 - time * 3.0) * 0.03;
  
  // Sample canvas texture content
  vec4 content = texture2D(tDiffuse, uv);

  // Base glass tint
  vec3 baseColor = (rimColor.r > 0.0 || rimColor.g > 0.0 || rimColor.b > 0.0) ? rimColor : vec3(0.05, 0.85, 1.0);
  vec3 neonGlow = baseColor * (border * 2.0 + scanWave);
  
  vec3 finalRgb = content.rgb + neonGlow + (baseColor * 0.08);
  float alpha = clamp(content.a * 0.92 + border * 0.75 + 0.32, 0.0, 0.95);

  gl_FragColor = vec4(finalRgb, alpha);
}
`;
