// The Primordia-cad parameters the agents turn. Every lever is a real generator parameter (`node gothic.mjs
// list` in Primordia-cad), picked from how a step in it moves runSimulation's metrics on the generator's
// defaults. Self-weight stress in a column is about density x g x height whatever its width, so a spire's or
// pinnacle's stress only falls with height while its width carries most of the mass; a buttress's flyer bends
// its pier, which a deeper pier resists; a lamp with one arm bends its post until a second arm balances it.
import { DEFAULT_KIND, GENERATORS } from "../../Primordia-cad/kernel/index.ts";
import { resolveParams } from "../../Primordia-cad/kernel/params.ts";
import type { ParamSpec, Params } from "../../Primordia-cad/kernel/params.ts";

/** The metric an agent wants lower. */
export type Goal = "stress" | "mass" | "deformation" | "overhangs";

interface Lever {
    param: string;
    dir: 1 | -1; // the direction that lowers the metric
    regions?: string[]; // only when the metric's region (runSimulation's height band) is one of these
    when?: (p: Params) => boolean; // only for designs like this
}

const TOP = ["upper", "top"];
const oneArm = (p: Params) => p.arms === 1;

// Per generator and goal, in order of preference. An agent takes the first lever that applies and can move.
const LEVERS: Record<string, Record<Goal, Lever[]>> = {
    spire: {
        stress: [{ param: "height", dir: -1 }],
        mass: [{ param: "baseWidth", dir: -1 }, { param: "height", dir: -1 }],
        deformation: [{ param: "height", dir: -1 }],
        overhangs: [{ param: "crockets", dir: -1 }, { param: "lucarnes", dir: -1 }, { param: "sides", dir: -1 }],
    },
    pinnacle: {
        stress: [{ param: "gablets", dir: -1, regions: TOP }, { param: "height", dir: -1 }],
        mass: [{ param: "width", dir: -1 }, { param: "height", dir: -1 }],
        deformation: [{ param: "height", dir: -1 }],
        overhangs: [{ param: "crockets", dir: -1 }, { param: "panels", dir: -1 }, { param: "gablets", dir: -1 }],
    },
    lancet: {
        stress: [{ param: "height", dir: -1 }, { param: "width", dir: -1 }],
        mass: [{ param: "depth", dir: -1 }, { param: "frameWidth", dir: -1 }],
        deformation: [{ param: "height", dir: -1 }],
        overhangs: [{ param: "lights", dir: -1 }],
    },
    rose: {
        stress: [{ param: "rimWidth", dir: -1 }, { param: "diameter", dir: -1 }],
        mass: [{ param: "depth", dir: -1 }, { param: "rimWidth", dir: -1 }],
        deformation: [{ param: "diameter", dir: -1 }],
        overhangs: [{ param: "petals", dir: -1 }],
    },
    buttress: {
        stress: [{ param: "pierDepth", dir: 1 }, { param: "thickness", dir: -1 }, { param: "span", dir: -1 }],
        mass: [{ param: "pierWidth", dir: -1 }, { param: "height", dir: -1 }],
        deformation: [{ param: "pinnacle", dir: -1, regions: TOP }, { param: "pierDepth", dir: 1 }, { param: "span", dir: -1 }],
        overhangs: [{ param: "pinnacle", dir: -1 }, { param: "crockets", dir: -1 }],
    },
    balustrade: {
        stress: [{ param: "posts", dir: 1 }, { param: "height", dir: -1 }],
        mass: [{ param: "depth", dir: -1 }, { param: "height", dir: -1 }],
        deformation: [{ param: "posts", dir: 1 }, { param: "height", dir: -1 }],
        overhangs: [{ param: "style", dir: -1 }],
    },
    lamp: {
        stress: [{ param: "arms", dir: 1, when: oneArm }, { param: "lanternSize", dir: -1 }],
        mass: [{ param: "lanternSize", dir: -1 }, { param: "height", dir: -1 }],
        deformation: [{ param: "arms", dir: 1, when: oneArm }, { param: "lanternSize", dir: -1 }],
        overhangs: [], // every arm adds two; taking one off a pair unbalances the post
    },
};

/** The part's generator and the value of each of its parameters: cadParams' own (clamped), else the default. */
export function designOf(cadParams: any = {}) {
    const kind: string = cadParams.kind ?? cadParams.generator ?? DEFAULT_KIND;
    const specs = GENERATORS[kind]?.params ?? {};
    return { kind, specs, params: resolveParams(specs, cadParams).params };
}

/** cadParams with `kind` and every generator parameter spelled out as the number the kernel builds. */
export function resolveDesign(cadParams: any = {}) {
    const { kind, params } = designOf(cadParams);
    return { ...cadParams, kind, ...params };
}

/** The keys that make `after` a different part from `before`: the generator, its parameters, the material. */
export function changedDesignKeys(before: any, after: any): string[] {
    const x = resolveDesign(before), y = resolveDesign(after);
    const keys = new Set(["kind", "material", ...Object.keys(designOf(x).specs), ...Object.keys(designOf(y).specs)]);
    return [...keys].filter((k) => (x[k] ?? "") !== (y[k] ?? ""));
}

export interface Fix {
    param: string;
    from: number;
    to: number;
    type: "increase" | "decrease";
    delta: number; // to - from, as applyMutation adds it
}

/**
 * The first lever for `goal` that applies to this design and can still move, or null when none is left.
 * `excess` is how far the metric is over its limit, as a fraction of the limit: the further, the bigger
 * the step (5% to 25% of the parameter's value, at least 1 for counts and switches).
 */
export function findFix(goal: Goal, cadParams: any, region: string | undefined, excess: number): Fix | null {
    const { kind, specs, params } = designOf(cadParams);
    for (const lever of LEVERS[kind]?.[goal] ?? []) {
        if (lever.regions && !lever.regions.includes(region ?? "")) continue;
        if (lever.when && !lever.when(params)) continue;
        const from = params[lever.param];
        const to = stepParam(specs[lever.param], from, lever.dir, excess);
        if (to !== from) return { param: lever.param, from, to, type: to > from ? "increase" : "decrease", delta: to - from };
    }
    return null;
}

export function describeFix(fix: Fix): string {
    return `${fix.type} ${fix.param} ${fix.from} -> ${fix.to}`;
}

function stepParam(spec: ParamSpec, from: number, dir: 1 | -1, excess: number): number {
    const fraction = excess >= 0.5 ? 0.25 : excess > 0.1 ? excess / 2 : 0.05;
    const to = spec.integer
        ? from + dir * Math.max(1, Math.round(from * fraction))
        : Math.round(from * (1 + dir * fraction) * 1000) / 1000; // to the millimetre
    return Math.min(spec.max, Math.max(spec.min, to));
}
