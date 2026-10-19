// The limits the design loop evolves a part towards, in the units runSimulation reports. The loop
// (Primordia-core/services/simulation-cycle.ts) stops once all of them hold, and each agent works on the one
// it watches. Every limit comes from cadParams when it is set there:
//
//   stressLimit       MPa    worst self-weight stress; default the material's working stress below
//   targetMass        kg     mass budget; default none, a part is as heavy as its design makes it
//   deformationLimit  mm     how far the top may move under its own weight; default 10 mm
//   maxOverhangs      count  downward patches that need support; default none, Gothic ornament overhangs

// Working stresses (MPa): roughly each runSimulation material's strength over a safety factor, for a part
// that carries its own weight. Stone is weak in the tension bending puts on one side of a section.
const WORKING_STRESS: Record<string, number> = {
    stone: 4,
    limestone: 4,
    sandstone: 3,
    granite: 10,
    marble: 8,
    iron: 40,
    castIron: 40,
    steel: 160,
    stainlessSteel: 140,
    aluminum: 70,
    titanium: 250,
    glass: 5,
};

export const DEFAULT_DEFORMATION_LIMIT = 10; // mm

export interface DesignLimits {
    stressLimit: number; // MPa
    targetMass: number; // kg
    deformationLimit: number; // mm
    maxOverhangs: number;
}

/** The limits for this part: cadParams' own, else defaults for the material runSimulation reported. */
export function designLimits(cadParams: any = {}, metrics: any = {}): DesignLimits {
    const material = String(metrics.material ?? cadParams.material ?? "stone").toLowerCase();
    const key = Object.keys(WORKING_STRESS).find((k) => k.toLowerCase() === material) ?? "stone";
    return {
        stressLimit: numberOr(cadParams.stressLimit, WORKING_STRESS[key]),
        targetMass: numberOr(cadParams.targetMass, Infinity),
        deformationLimit: numberOr(cadParams.deformationLimit, DEFAULT_DEFORMATION_LIMIT),
        maxOverhangs: numberOr(cadParams.maxOverhangs, Infinity),
    };
}

/** Which limits the metrics meet. */
export function checkLimits(metrics: any, limits: DesignLimits) {
    const stress = metrics.maxStress <= limits.stressLimit;
    const mass = metrics.mass <= limits.targetMass;
    const deformation = metrics.maxDeformation <= limits.deformationLimit;
    const overhangs = metrics.overhangCount <= limits.maxOverhangs;
    return { stress, mass, deformation, overhangs, all: stress && mass && deformation && overhangs };
}

function numberOr(value: unknown, fallback: number): number {
    const v = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}
