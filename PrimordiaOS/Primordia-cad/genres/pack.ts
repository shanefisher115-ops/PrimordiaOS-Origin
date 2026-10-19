// Genre packs: what a realm genre may build with the kernel, as plain data.
// A pack names generators, the parameter ranges that read as that genre ("style"), how each material slot
// looks, and the lighting preset its previews use. Packs never contain geometry code: generators live in
// kernel/, so every pack's pieces pass the same generic kernel tests.
import { GENERATORS } from "../kernel/index.ts";
import { LIGHTING } from "./lighting.ts";

export interface SlotLook {
    color: [number, number, number]; // linear RGB, 0..1
    roughness: number;
    metalness: number;
    emissive?: [number, number, number];
    emissiveIntensity?: number;
    opacity?: number; // < 1 renders transparent
}

export interface GeneratorStyle {
    weight: number; // relative chance the engineer picks this generator for an open brief
    /** Sampled parameters: [lo, hi] inside the generator's own range. Unlisted parameters stay at `fixed` or the default. */
    ranges: Record<string, [number, number]>;
    fixed?: Record<string, number>;
    triangleBudget: number; // the judge rejects anything heavier
    maxSize: [number, number, number]; // metres, x y z (Z up); the judge rejects anything bigger
}

export interface GenrePack {
    id: string; // "gothic"
    title: string; // "Gothic"
    version: string; // semver; bump when ranges or looks change, the catalog records it
    doc: string;
    assetPrefix: string; // asset names: SM_<assetPrefix><GeneratorTitle>_<id>
    unrealFolder: string; // /Game/ThirdParty/<Genre>Kit
    lighting: string; // a key of LIGHTING
    slots: Record<string, SlotLook>;
    generators: Record<string, GeneratorStyle>;
}

/** Problems with a pack, empty when it is valid. */
export function validatePack(pack: GenrePack): string[] {
    const errors: string[] = [];
    if (!/^[a-z][a-z0-9-]*$/.test(pack.id)) errors.push(`id "${pack.id}" must be lowercase kebab`);
    if (!/^\d+\.\d+\.\d+$/.test(pack.version)) errors.push(`version "${pack.version}" is not semver`);
    if (!/^\/Game\/ThirdParty\/[A-Za-z0-9]+Kit$/.test(pack.unrealFolder)) errors.push(`unrealFolder "${pack.unrealFolder}" must be /Game/ThirdParty/<Name>Kit`);
    if (!LIGHTING[pack.lighting]) errors.push(`lighting "${pack.lighting}" is not a preset (${Object.keys(LIGHTING).join(", ")})`);
    const kinds = Object.keys(pack.generators);
    if (kinds.length === 0) errors.push("no generators");
    for (const [kind, style] of Object.entries(pack.generators)) {
        const gen = GENERATORS[kind];
        if (!gen) { errors.push(`${kind}: no such generator`); continue; }
        if (!(style.weight > 0)) errors.push(`${kind}: weight must be > 0`);
        if (!(style.triangleBudget > 0)) errors.push(`${kind}: triangleBudget must be > 0`);
        if (style.maxSize.length !== 3 || style.maxSize.some((v) => !(v > 0))) errors.push(`${kind}: maxSize must be 3 positive numbers`);
        if (!pack.slots[gen.material]) errors.push(`${kind}: no slot look for its material "${gen.material}"`);
        for (const [param, [lo, hi]] of Object.entries(style.ranges)) {
            const spec = gen.params[param];
            if (!spec) { errors.push(`${kind}.${param}: not a parameter`); continue; }
            if (!(lo <= hi)) errors.push(`${kind}.${param}: range [${lo}, ${hi}] is reversed`);
            if (lo < spec.min || hi > spec.max) errors.push(`${kind}.${param}: [${lo}, ${hi}] leaves the generator's [${spec.min}, ${spec.max}]`);
        }
        for (const [param, v] of Object.entries(style.fixed ?? {})) {
            const spec = gen.params[param];
            if (!spec) errors.push(`${kind}.${param}: fixed value for a parameter that does not exist`);
            else if (v < spec.min || v > spec.max) errors.push(`${kind}.${param}: fixed ${v} leaves [${spec.min}, ${spec.max}]`);
            if (param in style.ranges) errors.push(`${kind}.${param}: both fixed and ranged`);
        }
    }
    for (const slot of ["Stone", "Glass", "Iron"]) if (!pack.slots[slot]) errors.push(`slot "${slot}" has no look`);
    return errors;
}

/** The pack as JSON the engineer agent and the WebGL previewer read (no functions, integer flags filled in). */
export function packData(pack: GenrePack) {
    return {
        ...pack,
        lightingPreset: LIGHTING[pack.lighting],
        generators: Object.fromEntries(Object.entries(pack.generators).map(([kind, style]) => {
            const gen = GENERATORS[kind];
            return [kind, {
                ...style,
                title: gen.title,
                material: gen.material,
                integer: Object.fromEntries(Object.keys(style.ranges).map((p) => [p, !!gen.params[p].integer])),
            }];
        })),
    };
}

/** A parameter set inside the pack's style for `kind`, from a [0, 1) random source. */
export function sampleStyle(pack: GenrePack, kind: string, rand: () => number): Record<string, number> {
    const style = pack.generators[kind];
    const gen = GENERATORS[kind];
    const out: Record<string, number> = { ...(style.fixed ?? {}) };
    for (const [param, [lo, hi]] of Object.entries(style.ranges)) {
        out[param] = gen.params[param].integer ? Math.min(hi, lo + Math.floor(rand() * (hi - lo + 1))) : lo + (hi - lo) * rand();
    }
    return out;
}
