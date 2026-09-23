"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileType = validateFileType;
exports.validateDirectory = validateDirectory;
function validateFileType(filename) {
    const forbidden = [".cjs", ".mjs", ".jsx"];
    return !forbidden.some(ext => filename.endsWith(ext));
}
function validateDirectory(path) {
    const forbiddenDirs = ["node_modules", ".next", "root"];
    return !forbiddenDirs.some(dir => path.includes(dir));
}
