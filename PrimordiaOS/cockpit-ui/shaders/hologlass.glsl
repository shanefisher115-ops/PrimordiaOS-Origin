// shaders/hologlass.glsl - Sovereign Holographic Glass & Neon Rim
uniform float time;
uniform sampler2D tDiffuse;
uniform vec3 rimColor;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Horizontal neon rim
  float edgeX = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
  // Vertical neon rim
  float edgeY = smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
  float border = 1.0 - (edgeX * edgeY);

  // Holographic scan wave
  float scanWave = sin(uv.y * 120.0 - time * 3.0) * 0.03;
  
  // Sample canvas texture content
  vec4 content = texture2D(tDiffuse, uv);

  // Base glass tint (cyberpunk cyan/emerald)
  vec3 baseColor = rimColor.r > 0.0 || rimColor.g > 0.0 || rimColor.b > 0.0 ? rimColor : vec3(0.05, 0.85, 1.0);
  vec3 neonGlow = baseColor * (border * 1.8 + scanWave);
  
  vec3 finalRgb = content.rgb + neonGlow + (baseColor * 0.06);
  float alpha = clamp(content.a * 0.92 + border * 0.75 + 0.28, 0.0, 0.95);

  gl_FragColor = vec4(finalRgb, alpha);
}
