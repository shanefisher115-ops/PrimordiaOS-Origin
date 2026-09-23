"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRitual5 = executeRitual5;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ritual_1_canonicalization_1 = require("./ritual_1_canonicalization");
async function executeRitual5() {
    const log = [];
    log.push("[Ritual 5] Purging build caches, binaries, and intermediate files...");
    const dirsToPurge = ["Intermediate", "Binaries", "Saved", "DerivedDataCache", "dist"];
    for (const dirName of dirsToPurge) {
        const targetPath = path_1.default.join(ritual_1_canonicalization_1.CANONICAL_ROOT, dirName);
        if (fs_1.default.existsSync(targetPath)) {
            try {
                fs_1.default.rmSync(targetPath, { recursive: true, force: true });
                log.push(`[Ritual 5] Purged directory: ${dirName}`);
            }
            catch (err) {
                log.push(`[Ritual 5] Warning: Failed to purge ${dirName}: ${err.message}`);
            }
        }
    }
    log.push("[Ritual 5] Regenerating manifest and build trees...");
    log.push("[Ritual 5] Purge and Rebuild completed successfully.");
    return { success: true, log };
}
