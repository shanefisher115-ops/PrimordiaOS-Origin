"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRitual4 = executeRitual4;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ritual_1_canonicalization_1 = require("./ritual_1_canonicalization");
async function executeRitual4() {
    const log = [];
    const scanResults = [];
    log.push("[Ritual 4] Executing Module Integrity Scan...");
    const scanPaths = [
        "Source/PrimordiaOS_Engine",
        "Source/PrimordiaUnreal",
        "Source/PrimordiaBridge",
        "Source/PrimordiaEditor",
        "Source/PrimordiaWorldBuilder",
        "modules",
        "kernel",
        "cli"
    ];
    for (const relPath of scanPaths) {
        const fullPath = path_1.default.join(ritual_1_canonicalization_1.CANONICAL_ROOT, relPath);
        if (!fs_1.default.existsSync(fullPath)) {
            fs_1.default.mkdirSync(fullPath, { recursive: true });
            scanResults.push({ path: relPath, status: "REPAIRED", details: "Created missing directory." });
            log.push(`[Ritual 4] Repaired missing directory: ${relPath}`);
        }
        else {
            const files = fs_1.default.readdirSync(fullPath);
            scanResults.push({ path: relPath, status: "OK", details: `Verified (${files.length} items)` });
            log.push(`[Ritual 4] Verified module path: ${relPath}`);
        }
    }
    // Verify index exports for modules directory
    const modulesIndexTs = path_1.default.join(ritual_1_canonicalization_1.CANONICAL_ROOT, "modules", "index.ts");
    const modulesIndexJs = path_1.default.join(ritual_1_canonicalization_1.CANONICAL_ROOT, "modules", "index.js");
    const exportStatement = `export * from "./ai-caption";\nexport * from "./ai-script";\nexport * from "./ai-thumbnail";\nexport * from "./autopost";\nexport * from "./metrics-instagram";\nexport * from "./metrics-tiktok";\nexport * from "./metrics-youtube";\nexport * from "./post-facebook";\nexport * from "./post-instagram";\nexport * from "./post-linkedin";\nexport * from "./post-reddit";\nexport * from "./post-x";\nexport * from "./post-youtube";\n`;
    fs_1.default.writeFileSync(modulesIndexTs, exportStatement, "utf8");
    fs_1.default.writeFileSync(modulesIndexJs, `module.exports = require('./index.ts');\n`, "utf8");
    log.push("[Ritual 4] Updated modules/index.ts integrity exports.");
    log.push("[Ritual 4] Module Integrity Scan completed successfully.");
    return { success: true, log, scanResults };
}
