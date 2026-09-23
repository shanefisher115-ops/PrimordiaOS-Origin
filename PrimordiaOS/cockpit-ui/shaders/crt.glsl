// shaders/crt.glsl - Sovereign CRT Cosmic Phosphor Glow
uniform float time;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Gentle barrel curvature
  vec2 centered = uv - 0.5;
  vec2 distortedUv = uv + centered * (dot(centered, centered) * 0.06);

  // Horizontal scanline oscillation
  float scan = sin(distortedUv.y * 800.0 + time * 10.0) * 0.04;
  
  // Center beam exponential phosphor bloom
  float glow = exp(-pow(distortedUv.y - 0.5, 2.0) * 20.0);

  // Texture sampling from dynamic terminal canvas
  vec4 texColor = texture2D(tDiffuse, distortedUv);

  // Phosphor color synthesis (Cosmic Teal / Sovereign Amber tint)
  vec3 phosphorBase = vec3(0.08, 0.95, 0.78);
  vec3 color = texColor.rgb + (phosphorBase * (glow * 0.35 + scan * 0.6));
  
  // Screen edge vignette
  float vignette = smoothstep(0.75, 0.45, length(centered));
  color *= vignette;

  gl_FragColor = vec4(color, 0.96);
}
