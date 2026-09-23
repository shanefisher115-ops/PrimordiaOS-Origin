import fs from "fs";
import path from "path";

const CONFIG = "C:/Users/Shane/PrimordiaWorldProject/Config/DefaultEngine.ini";

const ENGINE_SETTINGS = `
[/Script/EngineSettings.GameMapsSettings]
EditorStartupMap=/Game/Primordia/UI/StartupMap
GameDefaultMap=/Game/Primordia/UI/StartupMap

[/Script/Engine.RendererSettings]
r.DefaultFeature.AutoExposure=False
r.DefaultFeature.MotionBlur=False
r.DefaultFeature.AntiAliasing=2

[/Script/OpenXRHMD.OpenXRHMDSettings]
bEnableAutoTracking=True
bUseHandTracking=True
`;

fs.appendFileSync(CONFIG, ENGINE_SETTINGS);

console.log("PrimordiaOS AE: Engine configured.");
