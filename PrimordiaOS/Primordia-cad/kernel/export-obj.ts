// Wavefront OBJ writer (+ a matching .mtl). Like the glTF export, OBJ is written Y up:
// (x, y, z) -> (x, z, -y). OBJ texture v runs up the image, so the kernel's v is negated.
import type { Geometry } from "./index.ts";
import { MATERIAL_LOOKS } from "./export-gltf.ts";

export function toOBJ(g: Geometry, mtlFile?: string): { obj: string; mtl: string } {
    const r = g.render;
    const n = r.positions.length / 3;
    const f = (v: number) => (Math.abs(v) < 5e-7 ? "0" : v.toFixed(6).replace(/\.?0+$/, ""));
    const lines: string[] = [
        `# PrimordiaOS Primordia-cad gothic kernel: ${g.kind}`,
        `# params ${JSON.stringify(g.params)}`,
        "# units: metres, Y up",
    ];
    if (mtlFile) lines.push(`mtllib ${mtlFile}`);
    lines.push(`o ${g.name}`);
    for (let i = 0; i < n; i++) lines.push(`v ${f(r.positions[i * 3])} ${f(r.positions[i * 3 + 2])} ${f(-r.positions[i * 3 + 1])}`);
    for (let i = 0; i < n; i++) lines.push(`vt ${f(r.uvs[i * 2])} ${f(-r.uvs[i * 2 + 1])}`);
    for (let i = 0; i < n; i++) lines.push(`vn ${f(r.normals[i * 3])} ${f(r.normals[i * 3 + 2])} ${f(-r.normals[i * 3 + 1])}`);
    for (const group of r.groups) {
        lines.push(`usemtl ${group.material}`);
        for (let t = group.start; t < group.start + group.count; t += 3) {
            const a = r.indices[t] + 1, b = r.indices[t + 1] + 1, c = r.indices[t + 2] + 1;
            lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
        }
    }
    const mtl: string[] = ["# PrimordiaOS Primordia-cad gothic kernel"];
    for (const group of r.groups) {
        const look = MATERIAL_LOOKS[group.material] ?? MATERIAL_LOOKS.Stone;
        mtl.push(`newmtl ${group.material}`, `Kd ${look.color.slice(0, 3).map(f).join(" ")}`);
        if (look.emissive) mtl.push(`Ke ${look.emissive.map(f).join(" ")}`);
        mtl.push(`Ns ${f((1 - look.roughness) * 1000)}`, "");
    }
    return { obj: lines.join("\n") + "\n", mtl: mtl.join("\n") };
}
