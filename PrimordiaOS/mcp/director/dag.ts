export const PRODUCTION_DAG = [
  { id: "SceneSpec", dependsOn: [] },
  { id: "ShotSpec", dependsOn: ["SceneSpec"] },
  { id: "VertexStoryboard", dependsOn: ["ShotSpec"] },
  { id: "VertexCameraPath", dependsOn: ["VertexStoryboard"] },
  { id: "UnrealLevel", dependsOn: ["SceneSpec"] },
  { id: "UnrealActors", dependsOn: ["UnrealLevel", "VertexStoryboard"] },
  { id: "NiagaraFX", dependsOn: ["UnrealLevel", "SceneSpec"] },
  { id: "UnrealSequence", dependsOn: ["UnrealLevel", "VertexCameraPath", "UnrealActors", "NiagaraFX"] },
  { id: "UnrealRender", dependsOn: ["UnrealSequence"] },
  { id: "VertexRunwayPrompt", dependsOn: ["VertexStoryboard"] },
  { id: "RunwayVideo", dependsOn: ["VertexRunwayPrompt"] },
  { id: "BlenderScene", dependsOn: ["UnrealRender"] },
  { id: "BlenderFinalRender", dependsOn: ["BlenderScene"] }
];
