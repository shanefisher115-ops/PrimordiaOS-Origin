import { generateScenePlanWithGemini } from "./ai-director-gemini";
import { sendScenePlanToUnreal } from "./unreal-bridge";
import { sceneFinalVideo } from "./render-paths";
import { PIPELINE_CONFIG } from "./pipeline-config";
import { log } from "./log";
import { spawn } from "child_process";
import fs from "fs";
async function runBlender(sceneId) {
    log("blender", "starting", { sceneId });
    const args = [
        "-b",
        "-P",
        PIPELINE_CONFIG.blender.script,
        "--",
        `C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\renders\\${sceneId}`,
        sceneFinalVideo(sceneId),
    ];
    const proc = spawn(PIPELINE_CONFIG.blender.exe, args, { stdio: "inherit" });
    return new Promise((resolve, reject) => {
        proc.on("exit", (code) => {
            if (code === 0) {
                log("blender", "done", { sceneId });
                resolve();
            }
            else
                reject(new Error(`Blender ${code}`));
        });
    });
}
export async function runTextToVideoLogged(prompt) {
    log("pipeline", "prompt", { prompt });
    const plan = await generateScenePlanWithGemini(prompt);
    log("pipeline", "scene_plan", plan);
    await sendScenePlanToUnreal(plan);
    const sceneId = plan.scenes[0].id;
    await runBlender(sceneId);
    const out = sceneFinalVideo(sceneId);
    if (!fs.existsSync(out))
        throw new Error("Final video missing");
    log("pipeline", "complete", { output: out });
    return out;
}
