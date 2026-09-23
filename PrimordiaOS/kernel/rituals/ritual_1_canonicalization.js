"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANONICAL_ROOT = void 0;
exports.executeRitual1 = executeRitual1;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.CANONICAL_ROOT = "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS";
async function executeRitual1() {
    const log = [];
    log.push("[Ritual 1] Enforcing canonical root: " + exports.CANONICAL_ROOT);
    // 1. Verify / Create required directories
    const requiredDirs = [
        "Source/PrimordiaOS_Engine",
        "Source/PrimordiaOS_Engine/Public",
        "Source/PrimordiaOS_Engine/Private",
        "Source/PrimordiaUnreal",
        "Source/PrimordiaUnreal/Public",
        "Source/PrimordiaUnreal/Private",
        "Source/PrimordiaBridge",
        "Source/PrimordiaBridge/Public",
        "Source/PrimordiaBridge/Private",
        "Source/PrimordiaEditor",
        "Source/PrimordiaEditor/Public",
        "Source/PrimordiaEditor/Private",
        "Source/PrimordiaWorldBuilder",
        "Source/PrimordiaWorldBuilder/Public",
        "Source/PrimordiaWorldBuilder/Private",
        "modules",
        "kernel",
        "kernel/rituals",
        "cli",
        "cli/commands",
        "pipelines",
        "agents"
    ];
    for (const relDir of requiredDirs) {
        const fullPath = path_1.default.join(exports.CANONICAL_ROOT, relDir);
        if (!fs_1.default.existsSync(fullPath)) {
            fs_1.default.mkdirSync(fullPath, { recursive: true });
            log.push(`[Ritual 1] Created directory: ${relDir}`);
        }
    }
    // 2. Relocate misplaced C++ source files from root to Source/<Module>
    const relocations = [
        { file: "PrimordiaOS_Engine.Build.cs", target: "Source/PrimordiaOS_Engine/PrimordiaOS_Engine.Build.cs" },
        { file: "PrimordiaOS_Engine.cpp", target: "Source/PrimordiaOS_Engine/Private/PrimordiaOS_Engine.cpp" },
        { file: "PrimordiaOS_Engine.h", target: "Source/PrimordiaOS_Engine/Public/PrimordiaOS_Engine.h" },
        { file: "PrimordiaBridge.Build.cs", target: "Source/PrimordiaBridge/PrimordiaBridge.Build.cs" },
        { file: "PrimordiaBridge.cpp", target: "Source/PrimordiaBridge/Private/PrimordiaBridge.cpp" },
        { file: "PrimordiaBridge.h", target: "Source/PrimordiaBridge/Public/PrimordiaBridge.h" },
        { file: "PrimordiaEditor.Build.cs", target: "Source/PrimordiaEditor/PrimordiaEditor.Build.cs" },
        { file: "PrimordiaEditor.cpp", target: "Source/PrimordiaEditor/Private/PrimordiaEditor.cpp" },
        { file: "PrimordiaEditor.h", target: "Source/PrimordiaEditor/Public/PrimordiaEditor.h" },
        { file: "PrimordiaWorldBuilder.Build.cs", target: "Source/PrimordiaWorldBuilder/PrimordiaWorldBuilder.Build.cs" },
        { file: "PrimordiaWorldBuilder.cpp", target: "Source/PrimordiaWorldBuilder/Private/PrimordiaWorldBuilder.cpp" },
        { file: "PrimordiaWorldBuilder.h", target: "Source/PrimordiaWorldBuilder/Public/PrimordiaWorldBuilder.h" },
    ];
    for (const item of relocations) {
        const srcPath = path_1.default.join(exports.CANONICAL_ROOT, item.file);
        const destPath = path_1.default.join(exports.CANONICAL_ROOT, item.target);
        if (fs_1.default.existsSync(srcPath)) {
            // Move file
            fs_1.default.renameSync(srcPath, destPath);
            log.push(`[Ritual 1] Relocated ${item.file} -> ${item.target}`);
        }
    }
    log.push("[Ritual 1] Path Canonicalization completed successfully.");
    return { success: true, log };
}
