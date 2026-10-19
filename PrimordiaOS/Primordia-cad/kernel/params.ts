// Parameter specs for the generators. Every parameter is a plain number (metres, counts, ratios, or 0/1
// switches) with a default and a valid range, so agents can mutate any of them and regeneration
// always gets a buildable value.

export interface ParamSpec {
    default: number;
    min: number;
    max: number;
    integer?: boolean;
    doc: string;
}
export type ParamSpecs = Record<string, ParamSpec>;
export type Params = Record<string, number>;

/**
 * Resolves raw values (from a CLI, JSON, or applyMutation) against specs:
 *  - missing or non-numeric values take the default;
 *  - numeric strings are parsed;
 *  - { mode: "reshape", delta } from applyMutation is read as default + delta;
 *  - values are clamped to [min, max] and integer params rounded.
 * Keys that are not parameters of this generator are ignored (they are reported in warnings).
 */
export function resolveParams(specs: ParamSpecs, raw: Record<string, unknown> = {}, ignore: string[] = []) {
    const params: Params = {};
    const warnings: string[] = [];
    for (const [name, spec] of Object.entries(specs)) {
        let value: unknown = raw[name];
        let v: number;
        if (value === undefined || value === null) {
            v = spec.default;
        } else if (typeof value === "object" && typeof (value as { delta?: unknown }).delta === "number") {
            v = spec.default + (value as { delta: number }).delta;
        } else {
            v = typeof value === "number" ? value : Number(value);
            if (!Number.isFinite(v)) {
                warnings.push(`${name}: ${JSON.stringify(value)} is not a number; using ${spec.default}`);
                v = spec.default;
            }
        }
        if (spec.integer) v = Math.round(v);
        const clamped = Math.min(spec.max, Math.max(spec.min, v));
        if (clamped !== v) warnings.push(`${name}: ${v} is outside [${spec.min}, ${spec.max}]; using ${clamped}`);
        params[name] = clamped;
    }
    for (const key of Object.keys(raw)) {
        if (!(key in specs) && !ignore.includes(key)) warnings.push(`${key}: not a parameter of this generator; ignored`);
    }
    return { params, warnings };
}

export function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}
