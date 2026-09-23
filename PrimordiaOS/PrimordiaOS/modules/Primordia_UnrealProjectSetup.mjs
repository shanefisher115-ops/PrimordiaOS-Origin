// =============================================================
// PrimordiaOS Unreal Project Auto-Setup Script (AD-Fix)
// Corrected version that properly creates the .uproject file
// using UnrealEditor.exe and the -new flag.
// =============================================================

import fs from "fs";
import path from "path";
import { exec } from "child_process";

// -------------------------------------------------------------
// CONFIG — UPDATE THESE IF NEEDED
// -------------------------------------------------------------

const PROJECT_ROOT = "C:/Users/Shane/PrimordiaWorldProject";
const PROJECT_NAME = "PrimordiaWorld";

// Correct Unreal Engine path for UE 5.8
const UEPATH = `"C:/Program Files/Epic Games/UE_5.8/Engine/Binaries/Win64/UnrealEditor.exe"`;

// -------------------------------------------------------------
// ENSURE CLEAN PROJECT FOLDER
// -------------------------------------------------------------

function ensureCleanFolder() {
    if (fs.existsSync(PROJECT_ROOT)) {
        const files = fs.readdirSync(PROJECT_ROOT);
        if (files.length > 0) {
            throw new Error(
                `Folder ${PROJECT_ROOT} is not empty. Unreal requires an empty folder.`
            );
        }
    } else {
        fs.mkdirSync(PROJECT_ROOT);
    }
}

// -------------------------------------------------------------
// CREATE UNREAL PROJECT (.uproject)
// -------------------------------------------------------------

function createUnrealProject() {
    return new Promise((resolve, reject) => {
        const uprojectPath = `${PROJECT_ROOT}/${PROJECT_NAME}.uproject`;

        const cmd = `${UEPATH} "${uprojectPath}" -new`;

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(stderr || err);
            } else {
                resolve(stdout);
            }
        });
    });
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
// ENABLE VR PLUGINS (OpenXR)
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
// MAIN SETUP PIPELINE
// -------------------------------------------------------------

async function setup() {
    try {
        console.log("[PrimordiaOS] Ensuring clean project folder...");
        ensureCleanFolder();

        console.log("[PrimordiaOS] Creating Unreal project (.uproject)...");
        await createUnrealProject();

        console.log("[PrimordiaOS] Creating Primordia folder structure...");
        createPrimordiaFolders();

        console.log("[PrimordiaOS] Enabling VR plugins...");
        enableVRPlugins();

        console.log("\n==================================================");
        console.log(" PrimordiaOS Unreal Project Setup COMPLETE (AD-Fix)");
        console.log("==================================================\n");

        console.log(`[PrimordiaOS] Project ready at: ${PROJECT_ROOT}/${PROJECT_NAME}.uproject`);

    } catch (err) {
        console.error("[PrimordiaOS SETUP ERROR]", err);
    }
}

setup();
