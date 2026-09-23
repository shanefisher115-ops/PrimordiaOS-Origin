import { generateScenePlan } from "./ai-director";
import { sendScenePlanToUnreal } from "./unreal-bridge";
import { sceneFramesDir, sceneFinalVideo } from "./render-paths";
import { spawn } from "child_process";
import fs from "fs";

const BLENDER_EXE = "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe";
const BLENDER_SCRIPT = "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\modules\\media\\blender-composite.py";

async function runBlender(sceneId: string) {
  const framesDir = sceneFramesDir(sceneId);
  const outFile = sceneFinalVideo(sceneId);

  return new Promise<void>((resolve, reject) => {
    const args = ["-b", "-P", BLENDER_SCRIPT, "--", framesDir, outFile];
    const proc = spawn(BLENDER_EXE, args, { stdio: "inherit" });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Blender ${code}`))));
  });
}

export async function runTextToVideo(prompt: string) {
  const plan = await generateScenePlan(prompt);
  await sendScenePlanToUnreal(plan);
  const firstScene = plan.scenes[0].id;
  await runBlender(firstScene);
  const out = sceneFinalVideo(firstScene);
  if (!fs.existsSync(out)) throw new Error("Final video missing");
  return out;
}
