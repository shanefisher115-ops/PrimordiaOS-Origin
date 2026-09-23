import fs from "fs";
import path from "path";

const ROOT = "C:/Users/Shane/PrimordiaWorldProject";

const STRUCTURE = [
    "PrimordiaOS",
    "PrimordiaOS/OmniTool",
    "PrimordiaOS/Cockpit",
    "PrimordiaOS/SpatialMemory",
    "PrimordiaOS/Agents",
    "PrimordiaOS/Runtime",
    "PrimordiaOS/Bridge"
];

for (const dir of STRUCTURE) {
    fs.mkdirSync(path.join(ROOT, "Content", dir), { recursive: true });
}

console.log("PrimordiaOS AD: Base structure installed.");
