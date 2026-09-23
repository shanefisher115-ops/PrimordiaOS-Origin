import { WebSocket } from "ws";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
// --- CONFIG ---
const ROOT = "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS";
const RENDERS_DIR = path.join(ROOT, "renders");
const UNREAL_WS_URL = "ws://localhost:17800";
const BLENDER_EXE = "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe";
const BLENDER_SCRIPT = path.join(ROOT, "modules", "media", "blender_composite.py");
// --- AI DIRECTOR (stub) ---
async function generateScenePlan(prompt) {
    // TODO: call Gemini / LLM here
    return {
        scenes: [
            {
                id: "scene_01",
                environment: "cosmic_cathedral",
                characters: ["entity_alpha"],
                camera: "slow_dolly_forward",
                fx: ["pulsewave_burst"],
                duration: 4.5,
            },
        ],
    };
}
// --- UNREAL STAGE ---
async function sendToUnreal(plan) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(UNREAL_WS_URL);
        ws.on("open", () => {
            ws.send(JSON.stringify({
                type: "scene_plan",
                payload: plan,
            }));
        });
        ws.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "render_complete") {
                    ws.close();
                    resolve();
                }
            }
            catch (e) {
                // ignore
            }
        });
        ws.on("error", (err) => reject(err));
    });
}
// --- BLENDER STAGE ---
async function runBlenderComposite(sceneId) {
    return new Promise((resolve, reject) => {
        const renderPath = path.join(RENDS_DIR, sceneId);
        const finalOut = path.join(RENDS_DIR, `${sceneId}_final.mp4`);
        const args = [
            "-b",
            "-P",
            BLENDER_SCRIPT,
            "--",
            renderPath,
            finalOut,
        ];
        const proc = spawn(BLENDER_EXE, args, { stdio: "inherit" });
        proc.on("exit", (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Blender exited with code ${code}`));
        });
    });
}
// --- MAIN PIPELINE ---
export async function runTextToVideo(prompt) {
    // 1. AI Director → ScenePlan
    const plan = await generateScenePlan(prompt);
    // 2. Send plan to Unreal → render frames
    await sendToUnreal(plan);
    // 3. Composite in Blender
    const firstScene = plan.scenes[0].id;
    await runBlenderComposite(firstScene);
    // 4. Return final video path
    const finalOut = path.join(RENDS_DIR, `${firstScene}_final.mp4`);
    if (!fs.existsSync(finalOut)) {
        throw new Error("Final video not found after pipeline run.");
    }
    return finalOut;
}
// --- CLI ENTRYPOINT ---
if (require.main === module) {
    const prompt = process.argv.slice(2).join(" ") || "A cosmic cathedral of light and glass.";
    runTextToVideo(prompt)
        .then((out) => {
        console.log(JSON.stringify({ status: "ok", output: out }));
    })
        .catch((err) => {
        console.error(JSON.stringify({ status: "error", message: err.message }));
        process.exit(1);
    });
}
