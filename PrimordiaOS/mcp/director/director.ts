// inside mcp/director/director.ts

async runProduction(brief: string): Promise<MCPToolResult> {
  const ctx: MCPToolContext = {
    jobId: `job_${Date.now()}`,
    metadata: { brief }
  };

  console.log("=== DIRECTOR: INITIALIZING PRODUCTION ===");

  // 1. Global storyboard (scene + shots)
  const storyboard = await this.callTool("vertex.generate_storyboard", { brief }, ctx);
  const shots = storyboard.data?.shots ?? [];

  console.log(`=== DIRECTOR: ${shots.length} SHOTS DETECTED ===`);

  const shotResults: any[] = [];

  // 2. Sequential shot loop
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    console.log(`\n=== DIRECTOR: SHOT ${i + 1}/${shots.length} (${shot.id}) ===`);

    const result = await this.runShotCinematic(shot, ctx);
    shotResults.push(result);
  }

  console.log("\n=== DIRECTOR: PRODUCTION COMPLETE ===");

  return {
    success: true,
    data: {
      jobId: ctx.jobId,
      storyboard: storyboard.data,
      shots: shotResults
    }
  };
}

// per-shot cinematic sequencing (parallel + sequential)
async runShotCinematic(shot: any, ctx: MCPToolContext) {
  const out: any = { shotId: shot.id };

  console.log("--- STAGE 1: PLANNING (Vertex) ---");
  const storyboard = await this.callTool("vertex.generate_storyboard", { brief: shot.description }, ctx);
  out.VertexStoryboard = storyboard.data;

  const cameraPath = await this.callTool("vertex.generate_camera_path", {
    sceneDescription: storyboard.data
  }, ctx);
  out.VertexCameraPath = cameraPath.data;

  console.log("--- STAGE 2: SCENE SETUP (Unreal + Niagara) ---");
  const level = await this.callTool("unreal.create_level", {
    sceneSpec: storyboard.data
  }, ctx);
  out.UnrealLevel = level.data;

  await this.callTool("unreal.spawn_actor", {
    assetId: "hero_character",
    transform: { x: 0, y: 0, z: 0 }
  }, ctx);

  await this.callTool("niagara.configure_effect", {
    effectId: "rain_neon",
    params: { intensity: 1.0 }
  }, ctx);

  await this.callTool("unreal.setup_camera", {
    cameraPath: cameraPath.data,
    sequenceSpec: storyboard.data
  }, ctx);

  console.log("--- STAGE 3: PARALLEL RENDERS (Unreal + Runway) ---");

  const unrealRenderPromise = this.callTool("unreal.render_movie", {
    queueConfig: { resolution: "1920x1080", fps: 24 }
  }, ctx);

  const runwayPromptPromise = this.callTool("vertex.generate_runway_prompt", {
    sceneSpec: storyboard.data
  }, ctx);

  const [unrealRender, runwayPrompt] = await Promise.all([
    unrealRenderPromise,
    runwayPromptPromise
  ]);

  out.UnrealRender = unrealRender.data;
  out.VertexRunwayPrompt = runwayPrompt.data;

  const runwayVideoPromise = this.callTool("runway.generate_video", {
    prompt: runwayPrompt.data,
    style: "cyberpunk",
    duration: 10
  }, ctx);

  console.log("--- STAGE 4: BLENDER COMPOSITING ---");

  const blenderScene = await this.callTool("blender.setup_scene", {
    sceneSpec: storyboard.data
  }, ctx);
  out.BlenderScene = blenderScene.data;

  const [runwayVideo, finalRender] = await Promise.all([
    runwayVideoPromise,
    this.callTool("blender.render", {
      outputConfig: { format: "exr", samples: 128 }
    }, ctx)
  ]);

  out.RunwayVideo = runwayVideo.data;
  out.BlenderFinalRender = finalRender.data;

  console.log("--- SHOT COMPLETE ---");
  return out;
}
