// gothic CLI: generate one Gothic piece, or a whole kit folder.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { GENERATORS, generate, generatorFor, toGLB, toOBJ } from "./index.ts";
import type { Geometry } from "./index.ts";
import { previewPNG } from "./preview.ts";

const USAGE = `Primordia-cad gothic kernel: parametric Gothic architecture as glTF/OBJ meshes (metres, Z up in the kernel, Y up in files).

  node gothic.mjs <generator> [--<param> <value> ...] [--out <file.glb|file.obj>] [--name <MeshName>] [--preview <file.png> [--view-yaw <deg>] [--view-pitch <deg>]]
  node gothic.mjs kit [--out <dir>] [--formats glb,obj] [--preset <kit.json>]   (also writes <dir>/preview.png)
  node gothic.mjs list
  node gothic.mjs <generator> --help

Generators: ${Object.keys(GENERATORS).join(", ")}
Example:    node gothic.mjs spire --height 40 --sides 8 --out spire.glb`;

/** The default kit: one of each piece, plus the variants the cathedral scene uses. */
export const DEFAULT_KIT: { name: string; kind: string; params: Record<string, number> }[] = [
    { name: "SM_GothicSpire", kind: "spire", params: {} },
    { name: "SM_GothicPinnacle", kind: "pinnacle", params: {} },
    { name: "SM_GothicLancetWindow", kind: "lancet", params: {} },
    { name: "SM_GothicRoseWindow", kind: "rose", params: {} },
    { name: "SM_GothicFlyingButtress", kind: "buttress", params: {} },
    { name: "SM_GothicBalustrade", kind: "balustrade", params: {} },
    { name: "SM_GothicBalustradeTracery", kind: "balustrade", params: { style: 1 } },
    { name: "SM_GothicStreetLamp", kind: "lamp", params: {} },
    { name: "SM_GothicStreetLampTwin", kind: "lamp", params: { arms: 2, height: 4.8 } },
    { name: "SM_GothicGable", kind: "gable", params: {} },
    // Sized to the cathedral's measured walls (build_cathedral_scene.py): the wings' west gables (all rose, no
    // lancet band), the crossing spire that rises through the big ring, and the flank walls' rose, lancets and
    // flying buttresses.
    { name: "SM_GothicGableRose", kind: "gable", params: { width: 15, wallHeight: 6, lancets: 0 } },
    { name: "SM_GothicGableMain", kind: "gable", params: { width: 28, pitch: 60, wallHeight: 4, depth: 2, lancets: 0 } },
    { name: "SM_GothicSpireCrossing", kind: "spire", params: { height: 105, baseWidth: 12, crockets: 14, crocketSize: 1.4, bands: 3, finialHeight: 6 } },
    { name: "SM_GothicTower", kind: "tower", params: {} },
    { name: "SM_GothicCrossingTower", kind: "tower", params: { height: 60, width: 22, spireHeight: 62, lancets: 2, crockets: 14 } },
    { name: "SM_GothicRoseWindowFlank", kind: "rose", params: { diameter: 13, depth: 0.9, petals: 16, rimWidth: 0.8 } },
    { name: "SM_GothicLancetFlank", kind: "lancet", params: { width: 2.2, height: 10, lights: 2, frameWidth: 0.4, depth: 0.9 } },
    { name: "SM_GothicFlyingButtressFlank", kind: "buttress", params: { span: 7, height: 34, pierWidth: 2.2, pierDepth: 3, thickness: 1.6 } },
];

function camel(flag: string): string {
    return flag.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function parseArgs(argv: string[]) {
    const positional: string[] = [];
    const options: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith("--")) { positional.push(arg); continue; }
        const eq = arg.indexOf("=");
        if (eq > 0) { options[camel(arg.slice(2, eq))] = arg.slice(eq + 1); continue; }
        const key = camel(arg.slice(2));
        const next = argv[i + 1];
        if (next === undefined || (next.startsWith("--") && !/^--?\d/.test(next))) options[key] = "true";
        else { options[key] = next; i++; }
    }
    return { positional, options };
}

function describe(kind: string): string {
    const gen = generatorFor(kind);
    const rows = Object.entries(gen.params).map(([k, s]) => {
        const flag = "--" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
        return `  ${flag.padEnd(16)} ${String(s.default).padEnd(6)} [${s.min}..${s.max}]${s.integer ? " int" : ""}  ${s.doc}`;
    });
    return `${kind}: ${gen.doc}\n\n${rows.join("\n")}`;
}

function summary(g: Geometry, files: string[]): string {
    const b = g.bounds, size = b.max.map((v, k) => (v - b.min[k]).toFixed(2)).join(" x ");
    const flags = [g.stats.closed ? "closed" : "OPEN", `genus ${g.stats.genus}`, `${g.render.groups.map((x) => x.material).join("+")}`];
    return `${g.name}: ${g.stats.triangleCount} tris, ${size} m, ${flags.join(", ")} -> ${files.join(", ")}`;
}

/** Writes a geometry as .glb or .obj (+ .mtl) based on the file extension. Returns the files written. */
export function writeGeometry(g: Geometry, file: string): string[] {
    mkdirSync(dirname(resolve(file)), { recursive: true });
    const ext = extname(file).toLowerCase();
    if (ext === ".glb") { writeFileSync(file, toGLB(g)); return [file]; }
    if (ext === ".obj") {
        const mtlFile = basename(file, ext) + ".mtl";
        const { obj, mtl } = toOBJ(g, mtlFile);
        writeFileSync(file, obj);
        writeFileSync(join(dirname(file), mtlFile), mtl);
        return [file, join(dirname(file), mtlFile)];
    }
    throw new Error(`unsupported output "${file}": use .glb or .obj`);
}

export function buildKit(outDir: string, formats: string[], entries = DEFAULT_KIT) {
    mkdirSync(outDir, { recursive: true });
    const manifest = [];
    const built: Geometry[] = [];
    for (const e of entries) {
        const g = generate(e.kind, e.params, e.name);
        built.push(g);
        const files = formats.flatMap((fmt) => writeGeometry(g, join(outDir, `${e.name}.${fmt}`)));
        console.log(summary(g, files.map((f) => basename(f))));
        for (const w of g.warnings) console.log(`  warning: ${w}`);
        manifest.push({
            name: e.name, kind: e.kind, params: g.params, files: files.map((f) => basename(f)),
            triangles: g.stats.triangleCount, closed: g.stats.closed, genus: g.stats.genus,
            volume_m3: +g.stats.volume.toFixed(4), bounds_m: g.bounds, materials: g.render.groups.map((x) => x.material),
            sockets: g.sockets,
        });
    }
    writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ units: "m", up: "Y in files (Z in the kernel)", pieces: manifest }, null, 2) + "\n");
    writeFileSync(join(outDir, "preview.png"), previewPNG(built));
    return manifest;
}

export function main(argv: string[]): number {
    const { positional, options } = parseArgs(argv);
    const cmd = positional[0];
    if (!cmd || cmd === "help" || (options.help && !cmd)) { console.log(USAGE); return cmd ? 0 : 1; }
    if (cmd === "list") {
        for (const kind of Object.keys(GENERATORS)) console.log(describe(kind) + "\n");
        return 0;
    }
    if (cmd === "kit") {
        const out = options.out ?? "kit";
        const formats = (options.formats ?? "glb,obj").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        const entries = options.preset ? JSON.parse(readFileSync(options.preset, "utf8")) : DEFAULT_KIT;
        const manifest = buildKit(out, formats, entries);
        console.log(`kit: ${manifest.length} pieces in ${resolve(out)}`);
        return manifest.every((m) => m.closed) ? 0 : 2;
    }
    if (options.help) { console.log(describe(cmd)); return 0; }
    const gen = generatorFor(cmd);
    const { out, name, preview, viewYaw, viewPitch, ...rest } = options;
    for (const key of Object.keys(rest)) {
        if (!(key in gen.params)) throw new Error(`${cmd} has no parameter --${key}; run "node gothic.mjs ${cmd} --help"`);
    }
    const g = generate(cmd, rest, name);
    const files = writeGeometry(g, out ?? `${cmd}.glb`);
    if (preview) {
        writeFileSync(preview, previewPNG([g], { size: 768, yaw: viewYaw === undefined ? undefined : +viewYaw, pitch: viewPitch === undefined ? undefined : +viewPitch }));
        files.push(preview);
    }
    console.log(summary(g, files));
    for (const w of g.warnings) console.log(`  warning: ${w}`);
    return g.stats.closed ? 0 : 2;
}
