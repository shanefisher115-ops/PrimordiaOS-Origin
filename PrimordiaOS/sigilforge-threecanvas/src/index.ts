// Core Canvas Engine and Lifecycle
export { SigilForgeThreeCanvasEngine, EngineConfig } from './core/SigilForgeThreeCanvasEngine.js';
export { CanvasBoot, BootResult } from './core/CanvasBoot.js';
export { CanvasShutdown, ShutdownTargets } from './core/CanvasShutdown.js';

// Three.js Subsystem
export { ThreeSceneBuilder, SceneMetrics } from './three/ThreeSceneBuilder.js';
export { ThreeRenderer, RendererOptions } from './three/ThreeRenderer.js';
export { ThreeCamera, CameraOptions } from './three/ThreeCamera.js';

// GLSL Shaders
export {
  FoilVertexShader,
  FoilFragmentShader,
  FoilShaderUniforms,
  createFoilShaderMaterial,
} from './shaders/FoilShader.js';

export {
  SpecularVertexShader,
  SpecularFragmentShader,
  SpecularShaderUniforms,
  createSpecularShaderMaterial,
} from './shaders/SpecularShader.js';

export {
  ParticleVertexShader,
  ParticleFragmentShader,
  ParticleShaderUniforms,
  createParticleShaderMaterial,
} from './shaders/ParticleShader.js';

export {
  CosmicFieldVertexShader,
  CosmicFieldFragmentShader,
  CosmicFieldShaderUniforms,
  createCosmicFieldShaderMaterial,
} from './shaders/CosmicFieldShader.js';

// Audio Subsystem
export { AudioReactiveEngine, AudioBands } from './audio/AudioReactiveEngine.js';

// Items Registry Subsystem
export {
  ItemCategory,
  RarityTier,
  SigilItem,
  ItemFilterOptions,
} from './items/ItemMetadata.js';
export { SigilItemRegistry } from './items/SigilItemRegistry.js';

// Composition Subsystem
export {
  SigilCompositionEngine,
  ActiveSigilLayer,
} from './composition/SigilCompositionEngine.js';
export { HueWheel, ColorHarmonyType, HSLColor } from './composition/HueWheel.js';
export {
  OrbitalVelocityController,
  OrbitLayerState,
} from './composition/OrbitalVelocity.js';

// Cosmic Roll Subsystem
export {
  CosmicRollEngine,
  CosmicRollResult,
  SoundscapeCallback,
} from './cosmicroll/CosmicRollEngine.js';

// Export Subsystem
export { SigilExportEngine, ExportOptions } from './export/SigilExportEngine.js';

// Interaction Subsystem
export {
  CanvasInteractionLayer,
  ShockwaveCallback,
  PanelToggleCallback,
} from './interaction/CanvasInteractionLayer.js';

// Safety and Logging Subsystems
export { SigilForgeSafetyLayer, SafetyStatus } from './safety/SigilForgeSafetyLayer.js';
export {
  SigilForgeLogger,
  LogLevel,
  LogEntry,
  TelemetryListener,
} from './logging/SigilForgeLogger.js';
