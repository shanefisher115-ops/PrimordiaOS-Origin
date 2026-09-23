import { TaskGraph } from "../graph/graph";
import { Task } from "../graph/task";

export const createPremiumVideoPipeline = (params: {
  id: string;
  script: string;
  style: string;
  outputDir: string;
  unrealProjectPath: string;
  unrealExecutablePath: string;
  blenderProjectPath: string;
  resolveProjectPath: string;
}): TaskGraph => {
  const {
    id,
    script,
    style,
    outputDir,
    unrealProjectPath,
    unrealExecutablePath,
    blenderProjectPath,
    resolveProjectPath,
  } = params;

  const tasks: Task[] = [
    {
      id: "t-ai-director",
      name: "ai_analyze",
      agentId: "agent-ai-analysis",
      metadata: {
        input: script,
        style,
      },
      dependencies: [],
    },
    {
      id: "t-ai-shotlist",
      name: "ai_generate_prompt",
      agentId: "agent-ai-prompt",
      metadata: {
        topic: "shot list for cinematic sequence",
        sourceTaskId: "t-ai-director",
      },
      dependencies: ["t-ai-director"],
    },
    {
      id: "t-blender-character",
      name: "generate_character",
      agentId: "agent-blender-character",
      metadata: {
        blenderProjectPath,
        style,
      },
      dependencies: ["t-ai-shotlist"],
    },
    {
      id: "t-blender-export",
      name: "export_character",
      agentId: "agent-blender-character",
      metadata: {
        blenderProjectPath,
        exportFormat: "fbx",
        outputDir,
        sourceTaskId: "t-blender-character",
      },
      dependencies: ["t-blender-character"],
    },
    {
      id: "t-unreal-scene",
      name: "setup_unreal_scene",
      agentId: "agent-unreal-scene",
      metadata: {
        unrealProjectPath,
        characterSourceTaskId: "t-blender-export",
        style,
      },
      dependencies: ["t-blender-export"],
    },
    {
      id: "t-unreal-animate",
      name: "run_unreal_blueprint",
      agentId: "agent-unreal-blueprint",
      metadata: {
        unrealProjectPath,
        animationSourceTaskId: "t-ai-shotlist",
      },
      dependencies: ["t-unreal-scene"],
    },
    {
      id: "t-unreal-movie-render",
      name: "render_unreal_movie",
      agentId: "agent-unreal-movie-render",
      metadata: {
        unrealExecutablePath,
        unrealProjectPath,
        outputDir,
        sequenceSourceTaskId: "t-unreal-animate",
      },
      dependencies: ["t-unreal-animate"],
    },
    {
      id: "t-resolve-import",
      name: "resolve_import_media",
      agentId: "agent-resolve",
      metadata: {
        resolveProjectPath,
        mediaDir: outputDir,
        sourceTaskId: "t-unreal-movie-render",
      },
      dependencies: ["t-unreal-movie-render"],
    },
    {
      id: "t-resolve-render",
      name: "resolve_render_timeline",
      agentId: "agent-resolve",
      metadata: {
        resolveProjectPath,
        outputDir,
        presetName: "Primordia_Cinematic",
        sourceTaskId: "t-resolve-import",
      },
      dependencies: ["t-resolve-import"],
    },
  ];

  return {
    id,
    name: "Premium Video Pipeline",
    tasks,
  };
};
