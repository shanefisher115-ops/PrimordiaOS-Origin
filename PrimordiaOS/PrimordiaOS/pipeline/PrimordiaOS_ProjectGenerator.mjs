import fs from "fs";
import path from "path";

const TEMPLATE = "C:/Program Files/Epic Games/UE_5.8/Templates/PrimordiaWorldTemplate";
const TARGET = "C:/Users/Shane/PrimordiaWorldProject";

function wipe(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function copy(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
        const s = path.join(src, item);
        const d = path.join(dest, item);
        const stat = fs.statSync(s);
        if (stat.isDirectory()) copy(s, d);
        else fs.copyFileSync(s, d);
    }
}

wipe(TARGET);
fs.mkdirSync(TARGET);
copy(TEMPLATE, TARGET);

console.log("PrimordiaOS: Project generated from template.");
