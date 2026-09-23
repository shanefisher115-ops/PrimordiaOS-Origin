"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPersonas = loadPersonas;
exports.loadProspects = loadProspects;
exports.saveProspects = saveProspects;
exports.addProspect = addProspect;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadPersonas(customPath) {
    const p = customPath || path_1.default.join(__dirname, "..", "config", "personas.json");
    const raw = fs_1.default.readFileSync(p, "utf8");
    const json = JSON.parse(raw);
    return json.personas;
}
function loadProspects(customPath) {
    const p = customPath || path_1.default.join(__dirname, "..", "config", "prospects.json");
    if (!fs_1.default.existsSync(p)) {
        return [];
    }
    const raw = fs_1.default.readFileSync(p, "utf8");
    const json = JSON.parse(raw);
    return json;
}
function saveProspects(prospects, customPath) {
    const p = customPath || path_1.default.join(__dirname, "..", "config", "prospects.json");
    fs_1.default.writeFileSync(p, JSON.stringify(prospects, null, 2), "utf8");
    return p;
}
function addProspect(prospect, customPath) {
    const existing = loadProspects(customPath);
    existing.push(prospect);
    saveProspects(existing, customPath);
    return existing;
}
