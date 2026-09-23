const { createPremiumVideoPipeline } = require("./pipelines/premium-video-pipeline");
const { createRuntimeOrchestrator } = require("./runtime/runtime-orchestrator");
const { createShellBridge } = require("./runtime/primordia-shell-bridge");
const { createRuntimeState } = require("./runtime/runtime-state");
const { createTaskScheduler } = require("./runtime/task-scheduler");

async function main() {
  const graph = createPremiumVideoPipeline({
    id: "graph-premium-video-001",
    script: "A cosmic cathedral in the desert at sunset...",
    style: "cinematic, Unreal, Blender characters",
    outputDir: "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\renders\\premium-video-001",
    unrealProjectPath: "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\PrimordiaUnreal\\PrimordiaUnreal.uproject",
    unrealExecutablePath: "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe",
    blenderProjectPath: "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\BlenderProjects\\PrimordiaCharacters.blend",
    resolveProjectPath: "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\ResolveProjects\\PrimordiaPremiumVideo.drp",
  });

  const runtime = createRuntimeState();
  const scheduler = createTaskScheduler({ maxConcurrentTasks: 3 });
  const orchestrator = createRuntimeOrchestrator({ graph, runtime, scheduler });
  const shellBridge = createShellBridge();

  const result = await shellBridge.runGraph(graph, orchestrator);
  console.log("FINAL RESULT:", result);
}

main().catch(err => console.error(err));
