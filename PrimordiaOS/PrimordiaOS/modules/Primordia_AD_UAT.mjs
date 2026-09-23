// =============================================================
// PrimordiaOS Unreal Project Auto-Setup Script (AD-UAT)
// FULL AUTOMATION for UE 5.8 using Unreal Automation Tool (UAT)
// =============================================================

import fs from "fs";
import path from "path";
import { exec } from "child_process";

// -------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------

const UE_ROOT = "C:/Program Files/Epic Games/UE_5.8";
const UAT = `"${UE_ROOT}/Engine/Build/BatchFiles/RunUAT.bat"`;

const PROJECT_ROOT = "C:/Users/Shane/PrimordiaWorldProject";
const PROJECT_NAME = "PrimordiaWorld";
const UPROJECT = `${PROJECT_ROOT}/${PROJECT_NAME}.uproject`;

// -------------------------------------------------------------
// EXEC HELPERS
// -------------------------------------------------------------

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) reject(stderr || err);
            else resolve(stdout);
        });
    });
}

// -------------------------------------------------------------
// ENSURE CLEAN PROJECT FOLDER
// -------------------------------------------------------------

function ensureCleanFolder() {
    if (fs.existsSync(PROJECT_ROOT)) {
        const files = fs.readdirSync(PROJECT_ROOT);
        if (files.length > 0) {
            throw new Error(
                `Folder ${PROJECT_ROOT} must be empty for UAT project creation.`
            );
        }
    } else {
        fs.mkdirSync(PROJECT_ROOT);
    }
}

// -------------------------------------------------------------
// CREATE PROJECT USING UAT
// -------------------------------------------------------------

async function createProjectUAT() {
    const cmd = `${UAT} CreateProject -project="${UPROJECT}" -projectname="${PROJECT_NAME}" -projectroot="${PROJECT_ROOT}"`;

    console.log("[PrimordiaOS] Running UAT project creation...");
    return await run(cmd);
}

// -------------------------------------------------------------
// CREATE PRIMORDIA FOLDER STRUCTURE
// -------------------------------------------------------------

function createPrimordiaFolders() {
    const dirs = [
        "Content/Primordia",
        "Content/Primordia/Blueprints",
        "Content/Primordia/Materials",
        "Content/Primordia/FX",
        "Content/Primordia/UI",
        "Content/Primordia/Cockpit",
        "Content/Primordia/OmniTool"
    ];

    dirs.forEach(dir => {
        const full = path.join(PROJECT_ROOT, dir);
        fs.mkdirSync(full, { recursive: true });
    });
}

// -------------------------------------------------------------
// ENABLE VR PLUGINS
// -------------------------------------------------------------

function enableVRPlugins() {
    const configDir = path.join(PROJECT_ROOT, "Config");
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);

    const pluginsFile = path.join(configDir, "DefaultPlugins.ini");

    const content = `
[/Script/Engine.PluginReference]
EnabledPlugins=OpenXR
EnabledPlugins=OpenXRHandTracking
EnabledPlugins=OpenXRInput
EnabledPlugins=OpenXRFeatures
EnabledPlugins=OpenXRHMD
EnabledPlugins=OpenXRLocalization
EnabledPlugins=OpenXRInteractionProfile
EnabledPlugins=OpenXRSceneUnderstanding
EnabledPlugins=OpenXRPlatform
EnabledPlugins=OpenXRAR
`;

    fs.writeFileSync(pluginsFile, content);
}

// -------------------------------------------------------------
// MAIN PIPELINE
// -------------------------------------------------------------

async function setup() {
    try {
        console.log("[PrimordiaOS] Ensuring clean project folder...");
        ensureCleanFolder();

        console.log("[PrimordiaOS] Creating Unreal project via UAT...");
        await createProjectUAT();

        console.log("[PrimordiaOS] Creating Primordia folder structure...");
        createPrimordiaFolders();

        console.log("[PrimordiaOS] Enabling VR plugins...");
        enableVRPlugins();

        console.log("\n==================================================");
        console.log(" PrimordiaOS Unreal Project Setup COMPLETE (AD-UAT)");
        console.log("==================================================\n");

        console.log(`[PrimordiaOS] Project ready at: ${UPROJECT}`);

    } catch (err) {
        console.error("[PrimordiaOS SETUP ERROR]", err);
    }
}

setup();
