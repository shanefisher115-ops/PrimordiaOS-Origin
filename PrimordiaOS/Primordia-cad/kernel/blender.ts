// Blender finishing stage: runs blender/finish.py headless on a kernel .glb (bevels, weighted normals,
// bake UVs, AO + curvature maps, LODs, .glb/.web.glb/.fbx exports, an EEVEE preview).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "blender", "finish.py");

export interface FinishOptions {
    name?: string;
    bevel?: number; // metres; omit for 0.4% of the piece's size, 0 for none
    angle?: number; // degrees: sharper edges are bevelled and kept sharp
    bake?: number; // AO/curvature map size in pixels; 0 = no bake
    samples?: number;
    lods?: number[]; // decimation ratios, e.g. [0.5, 0.25]
    fbx?: boolean;
    draco?: boolean;
    preview?: number; // preview size in pixels; 0 = none
}

export interface FinishResult {
    name: string;
    triangles_in: number;
    triangles_out: number;
    bevel_m: number;
    dimensions_m: number[];
    seconds: number;
    files: Record<string, unknown>;
    dir: string;
}

function newestIn(dir: string, prefix: string): string | null {
    if (!existsSync(dir)) return null;
    const found = readdirSync(dir).filter((d) => d.toLowerCase().startsWith(prefix)).sort().reverse();
    for (const d of found) {
        const exe = join(dir, d, process.platform === "win32" ? "blender.exe" : "blender");
        if (existsSync(exe)) return exe;
    }
    return null;
}

/**
 * Finds Blender: $PRIMORDIA_BLENDER, then portable installs in %LOCALAPPDATA%\Programs, then
 * Program Files, then `blender` on the PATH. Returns null if there is none.
 */
export function findBlender(): string | null {
    const env = process.env.PRIMORDIA_BLENDER;
    if (env && existsSync(env)) return env;
    if (process.platform === "win32") {
        const local = process.env.LOCALAPPDATA && newestIn(join(process.env.LOCALAPPDATA, "Programs"), "blender");
        if (local) return local;
        const pf = newestIn(join(process.env.ProgramFiles ?? "C:\\Program Files", "Blender Foundation"), "blender");
        if (pf) return pf;
    }
    const probe = spawnSync("blender", ["--version"], { encoding: "utf8" });
    return probe.status === 0 ? "blender" : null;
}

/** Finishes one .glb into outDir. Throws with Blender's output if the stage fails. */
export function finishMesh(input: string, outDir: string, opts: FinishOptions = {}): FinishResult {
    const blender = findBlender();
    if (!blender) throw new Error("Blender not found: install it or set PRIMORDIA_BLENDER to blender.exe");
    const name = opts.name ?? basename(input, extname(input));
    const args = ["-b", "--factory-startup", "--python", SCRIPT, "--", "--in", input, "--out", outDir, "--name", name];
    const flag = (k: string, v: unknown) => { if (v !== undefined) args.push(`--${k}`, String(v)); };
    flag("bevel", opts.bevel);
    flag("angle", opts.angle);
    flag("bake", opts.bake);
    flag("samples", opts.samples);
    flag("lods", opts.lods?.join(","));
    flag("fbx", opts.fbx === undefined ? undefined : Number(opts.fbx));
    flag("draco", opts.draco === undefined ? undefined : Number(opts.draco));
    flag("preview", opts.preview);
    const run = spawnSync(blender, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const report = join(outDir, `${name}.finish.json`);
    if (run.status !== 0 || !existsSync(report)) {
        const tail = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.split("\n").filter((l) => /finish|Error|Traceback|line \d/.test(l)).slice(-15);
        throw new Error(`Blender finishing failed for ${input} (exit ${run.status}):\n${tail.join("\n")}`);
    }
    return { ...JSON.parse(readFileSync(report, "utf8")), dir: outDir };
}
