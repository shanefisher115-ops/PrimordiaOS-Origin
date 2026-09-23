import { MCPTool } from "./types.js";
import { createLevel, spawnActor, setupCamera, renderMovie } from "./unreal.js";
import { configureNiagara } from "./niagara.js";
import { importAsset, setupScene, renderBlender } from "./blender.js";
import { generateVideo, editVideo } from "./runway.js";
import { generateCameraPath, generateStoryboard, generateRunwayPrompt } from "./vertex.js";

export const ALL_TOOLS: MCPTool[] = [
  createLevel,
  spawnActor,
  setupCamera,
  renderMovie,
  configureNiagara,
  importAsset,
  setupScene,
  renderBlender,
  generateVideo,
  editVideo,
  generateCameraPath,
  generateStoryboard,
  generateRunwayPrompt,
];
