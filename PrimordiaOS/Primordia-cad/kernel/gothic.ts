// Parametric Gothic architecture. Every generator is a pure function of plain numeric params.
// Conventions: metres, Z up, pivot at the base centre (z = 0 is the ground). Elevation pieces
// (windows, balustrade) face -Y and run along X. Triangles default to the generator's material;
// glazing is tagged "Glass" so it can glow in a separate material slot.
import { CrossSection, Manifold, tag } from "./manifold.ts";
import type { Section, Solid } from "./manifold.ts";
import {
    box, distanceToEdges, extrude, extrudeAlongX, extrudeElevation, foiled, lathe, ngon, pointedArch, section, sweep, union,
} from "./ops.ts";
import type { Vec2, Vec3 } from "./ops.ts";
import type { Box } from "./mesh.ts";
import { clamp } from "./params.ts";
import type { ParamSpecs, Params } from "./params.ts";

export interface Generator {
    name: string; // CLI / params.kind name
    title: string; // used for asset names: SM_Gothic<Title>
    doc: string;
    material: string; // material of untagged triangles
    params: ParamSpecs;
    /** The envelope the mesh is guaranteed to stay inside, for these params. */
    bounds(p: Params): Box;
    build(p: Params, warn: (msg: string) => void): Solid;
    /** Named attachment points (metres, model space), e.g. where a lamp's light goes. */
    sockets?(p: Params): Record<string, Vec3>;
}

const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({ min: [x0, y0, z0], max: [x1, y1, z1] });
const rad = (deg: number) => (deg * Math.PI) / 180;

// ---------------------------------------------------------------- shared ornaments

/**
 * A crocket: a leaf that rises off an arris and curls outward into a bud. Local frame: origin on the
 * arris, +X outward, +Z up. Reaches 1.3 s outward and 0.85 s up; its root sinks into the stone below.
 */
function crocket(s: number): Solid {
    const path: Vec3[] = [[-0.25 * s, 0, -0.35 * s]];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
        const a = Math.PI - (i / steps) * ((5 * Math.PI) / 6);
        path.push([0.55 * s + 0.55 * s * Math.cos(a), 0, 0.55 * s * Math.sin(a)]);
    }
    const scales = path.map((_, i) => 1 - (0.4 * i) / (path.length - 1));
    const end = path[path.length - 1];
    // The leaf is flat: thin in the plane of the curl, broad sideways.
    const leaf: Vec2[] = [];
    for (let k = 0; k < 8; k++) leaf.push([0.13 * s * Math.cos((k * Math.PI) / 4), 0.3 * s * Math.sin((k * Math.PI) / 4)]);
    return union([
        sweep(leaf, path, scales),
        Manifold.sphere(0.22 * s, 8).translate([end[0] + 0.05 * s, 0, end[2]]),
    ]);
}

/** Finial: a turned knop and spike with four leaves at the neck. r is the neck radius; top at z = fh. */
function finial(fh: number, r: number): Solid {
    const profile: Vec2[] = [
        [0, 0], [r * 1.25, 0], [r * 1.25, 0.05 * fh], [r * 0.6, 0.12 * fh], [r * 0.5, 0.3 * fh], [r * 1.3, 0.42 * fh],
        [r * 1.3, 0.48 * fh], [r * 0.55, 0.56 * fh], [r * 0.32, 0.64 * fh], [r * 0.5, 0.72 * fh], [r * 0.12, 0.92 * fh], [0, fh],
    ];
    const parts = [lathe(profile, 12)];
    const leaf = crocket(Math.min(r * 0.9, 0.12 * fh));
    for (let k = 0; k < 4; k++) {
        const phi = 45 + 90 * k;
        parts.push(leaf.rotate([0, 0, phi]).translate([0.5 * r * Math.cos(rad(phi)), 0.5 * r * Math.sin(rad(phi)), 0.2 * fh]));
    }
    return union(parts);
}

interface TaperedSpire {
    sides: number; rBase: number; z0: number; z1: number; rTop: number;
    crockets: number; crocketSize: number; bands: number;
}

/** A tapering n-sided spire body from z0 to z1 with string-course bands and crockets on every arris. */
function taperedSpire(o: TaperedSpire): Solid[] {
    const n = o.sides, start = 180 / n; // flats face the axes
    const hp = o.z1 - o.z0;
    const r = (z: number) => o.rBase + ((o.rTop - o.rBase) * (z - o.z0)) / hp;
    const parts: Solid[] = [extrude(ngon(n, o.rBase, start), hp, o.rTop / o.rBase).translate([0, 0, o.z0])];
    const bo = Math.max(0.03, 0.035 * o.rBase), hb = Math.max(0.06, 0.02 * hp);
    for (let j = 1; j <= o.bands; j++) {
        const z = o.z0 + (hp * j) / (o.bands + 1);
        const ra = r(z) + bo, rb = r(z + hb) + bo;
        parts.push(extrude(ngon(n, ra, start), hb, rb / ra).translate([0, 0, z]));
    }
    const s = Math.min(o.crocketSize, 0.08 * hp, 0.5 * o.rBase);
    if (o.crockets > 0 && s > 0.01) {
        const proto = crocket(s);
        for (let i = 0; i < o.crockets; i++) {
            const t = o.crockets === 1 ? 0.5 : i / (o.crockets - 1);
            const z = o.z0 + hp * (0.1 + 0.75 * t);
            const f = 1 - 0.45 * t, rz = r(z);
            for (let k = 0; k < n; k++) {
                const phi = start + (360 * k) / n;
                parts.push(proto.scale(f).rotate([0, 0, phi]).translate([rz * Math.cos(rad(phi)), rz * Math.sin(rad(phi)), z]));
            }
        }
    }
    return parts;
}

/** Blind or open lancet seen face-on: the cutter for a recess of the given depth, centred on y = 0. */
function lancetCutter(halfWidth: number, springZ: number, bottomZ: number, depth: number): Solid {
    return extrudeElevation(pointedArch(halfWidth, springZ, 2 * halfWidth, bottomZ).outline, depth);
}

// ---------------------------------------------------------------- spire

const spireParams: ParamSpecs = {
    height: { default: 40, min: 6, max: 160, doc: "overall height to the finial tip (m)" },
    baseWidth: { default: 12, min: 2, max: 40, doc: "width across the flats at the base (m)" },
    sides: { default: 8, min: 4, max: 16, integer: true, doc: "number of faces (8 = octagonal)" },
    crockets: { default: 9, min: 0, max: 40, integer: true, doc: "crockets along each arris" },
    crocketSize: { default: 0.9, min: 0.1, max: 3, doc: "how far a crocket reaches out (m)" },
    bands: { default: 2, min: 0, max: 6, integer: true, doc: "string-course bands up the spire" },
    lucarnes: { default: 1, min: 0, max: 1, integer: true, doc: "gabled lucarnes on alternate faces (0/1)" },
    finialHeight: { default: 3, min: 0.3, max: 15, doc: "finial height (m)" },
};

function spireLayout(p: Params) {
    const H = p.height, n = p.sides;
    const A = p.baseWidth / 2, Rc = A / Math.cos(Math.PI / n);
    const fh = Math.min(p.finialHeight, 0.25 * H);
    const hc = clamp(0.035 * H, 0.3, 2.0);
    const rTop = clamp(0.12 * fh, 0.05, 0.12 * A);
    return { H, n, A, Rc, fh, hc, rTop, z0: hc * 0.5, z1: H - fh + 0.02 * fh };
}

export const spire: Generator = {
    name: "spire",
    title: "Spire",
    doc: "Tapering polygonal spire with a moulded collar, string courses, crockets on every arris, gabled lucarnes and a finial.",
    material: "Stone",
    params: spireParams,
    bounds(p) {
        const L = spireLayout(p);
        const half = Math.max(L.Rc * 1.06, L.Rc + 1.3 * p.crocketSize, L.Rc * 1.035 + 0.03);
        return box3(-half, -half, 0, half, half, L.H);
    },
    sockets(p) { return { tip: [0, 0, p.height] }; },
    build(p) {
        const L = spireLayout(p);
        const start = 180 / L.n;
        const parts: Solid[] = [
            extrude(ngon(L.n, L.Rc * 1.03, start), L.hc), // collar
            extrude(ngon(L.n, L.Rc * 1.06, start), 0.3 * L.hc).translate([0, 0, 0.7 * L.hc]), // cornice
            ...taperedSpire({
                sides: L.n, rBase: L.Rc, z0: L.z0, z1: L.z1, rTop: L.rTop,
                crockets: p.crockets, crocketSize: p.crocketSize, bands: p.bands,
            }),
            finial(L.fh, L.rTop).translate([0, 0, L.H - L.fh]),
        ];
        if (p.lucarnes && L.n >= 4) {
            const r = (z: number) => L.Rc + ((L.rTop - L.Rc) * (z - L.z0)) / (L.z1 - L.z0);
            const faceWidth = 2 * r(L.hc) * Math.sin(Math.PI / L.n);
            let wl = 0.5 * faceWidth;
            wl = Math.min(wl, (0.3 * (L.z1 - L.hc)) / 2.25); // lucarne height is 2.25 wl
            const front = r(L.hc) * Math.cos(Math.PI / L.n);
            const lucarne = buildLucarne(wl);
            for (let k = 0; k < L.n; k += 2) {
                if (L.n % 2 === 1 && k === L.n - 1) continue;
                const theta = (360 * k) / L.n;
                parts.push(lucarne.rotate([0, 0, theta]).translate([front * Math.cos(rad(theta)), front * Math.sin(rad(theta)), L.hc - 0.01]));
            }
        }
        return union(parts);
    },
};

/** A gabled dormer facing +X with its front at x = 0, a blind lancet in the front and a gable finial. */
function buildLucarne(wl: number): Solid {
    const hl = 1.5 * wl, gl = 0.75 * wl, dl = 1.2 * wl;
    const house: Vec2[] = [[-wl / 2, 0], [wl / 2, 0], [wl / 2, hl], [0, hl + gl], [-wl / 2, hl]];
    const body = extrudeAlongX(house, -dl, 0);
    const opening = pointedArch(0.24 * wl, 0.55 * hl, 0.48 * wl, 0.12 * hl).outline;
    const cut = extrudeAlongX(opening, -0.35 * wl, 0.01);
    const knob = lathe([[0, 0], [0.09 * wl, 0], [0.05 * wl, 0.1 * wl], [0.07 * wl, 0.18 * wl], [0, 0.45 * wl]], 8)
        .translate([-0.1 * wl, 0, hl + gl - 0.06 * wl]);
    return union([body.subtract(cut), knob]);
}

// ---------------------------------------------------------------- pinnacle

const pinnacleParams: ParamSpecs = {
    height: { default: 5, min: 0.8, max: 30, doc: "overall height (m)" },
    width: { default: 0.9, min: 0.15, max: 6, doc: "shaft width (m); capped at 0.35 x height" },
    crockets: { default: 4, min: 0, max: 20, integer: true, doc: "crockets along each arris of the spirelet" },
    gablets: { default: 1, min: 0, max: 1, integer: true, doc: "small gables on each face at the top of the shaft (0/1)" },
    panels: { default: 1, min: 0, max: 1, integer: true, doc: "blind lancet panels on the shaft faces (0/1)" },
};

function pinnacleLayout(p: Params) {
    const H = p.height, w = Math.min(p.width, 0.35 * H);
    const hs = 0.42 * H, fh = clamp(0.16 * H, 0.1, 4);
    return { H, w, hs, fh, rTop: clamp(0.12 * fh, 0.01, 0.1 * w), plinth: 0.06 * H };
}

export const pinnacle: Generator = {
    name: "pinnacle",
    title: "Pinnacle",
    doc: "Square pinnacle: plinth, shaft with blind lancet panels, crossing gablets, crocketed spirelet and finial.",
    material: "Stone",
    params: pinnacleParams,
    bounds(p) {
        const { w, H } = pinnacleLayout(p);
        return box3(-0.8 * w, -0.8 * w, 0, 0.8 * w, 0.8 * w, H);
    },
    sockets(p) { return { tip: [0, 0, p.height] }; },
    build(p, warn) {
        const L = pinnacleLayout(p);
        const { w, H, hs } = L;
        if (w < p.width) warn(`width: capped at ${w.toFixed(3)} m (0.35 x height)`);
        const parts: Solid[] = [
            box([-0.56 * w, -0.56 * w, 0], [0.56 * w, 0.56 * w, L.plinth]),
            box([-w / 2, -w / 2, 0], [w / 2, w / 2, hs]),
        ];
        if (p.gablets) {
            const gable: Vec2[] = [[-0.53 * w, hs - 0.15 * w], [0.53 * w, hs - 0.15 * w], [0, hs + 0.5 * w]];
            const g = extrudeElevation(gable, 1.06 * w);
            parts.push(g, g.rotate([0, 0, 90]));
        }
        parts.push(...taperedSpire({
            sides: 4, rBase: 0.42 * w * Math.SQRT2, z0: hs - 0.05 * w, z1: H - L.fh + 0.02 * L.fh, rTop: L.rTop,
            crockets: p.crockets, crocketSize: 0.16 * w, bands: 0,
        }));
        parts.push(finial(L.fh, L.rTop).translate([0, 0, H - L.fh]));
        let solid = union(parts);
        if (p.panels) {
            const a = 0.2 * w, apex = hs - 0.2 * w;
            const spring = apex - Math.sqrt(3) * a;
            const bottom = L.plinth + 0.1 * w;
            if (spring > bottom + 0.2 * w) {
                const cutter = lancetCutter(a, spring, bottom, 0.12 * w).translate([0, -w / 2, 0]);
                solid = solid.subtract(union([0, 90, 180, 270].map((d) => cutter.rotate([0, 0, d]))));
            }
        }
        return solid;
    },
};

// ---------------------------------------------------------------- lancet window

const lancetParams: ParamSpecs = {
    width: { default: 2.4, min: 0.5, max: 10, doc: "clear width of the opening (m)" },
    height: { default: 7, min: 1.2, max: 30, doc: "overall height, sill to hood-mould apex (m)" },
    pointedness: { default: 1, min: 0.5, max: 2, doc: "arch radius / opening width: 0.5 round, 1 equilateral, >1 lancet" },
    lights: { default: 2, min: 1, max: 6, integer: true, doc: "number of lights (openings between mullions)" },
    frameWidth: { default: 0.3, min: 0.06, max: 1.2, doc: "width of the frame around the opening (m)" },
    depth: { default: 0.5, min: 0.08, max: 2, doc: "frame depth through the wall (m)" },
    foils: { default: 4, min: 0, max: 8, integer: true, doc: "oculus in the head: 0 none, 1-2 plain circle, 3+ foiled" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "include a glass pane in the 'Glass' material slot (0/1)" },
};

function lancetLayout(p: Params, warn?: (m: string) => void) {
    let a = p.width / 2, fw = Math.min(p.frameWidth, 0.6 * a);
    const H = p.height;
    for (let i = 0; i < 40; i++) {
        const hw = 0.35 * fw, sill = clamp(0.6 * fw, 0.05, 0.6), G = fw + hw;
        const budget = H - sill - 0.25 * a; // arch rise allowed above the springline
        if (budget >= a + G) {
            // Largest radius <= requested whose outer apex fits: (G + a)(2R + G - a) = budget^2.
            const fit = ((budget * budget) / (G + a) - G + a) / 2;
            const R = Math.max(a, Math.min(p.pointedness * 2 * a, fit));
            if (R < p.pointedness * 2 * a - 1e-9) warn?.(`pointedness: lowered to ${(R / (2 * a)).toFixed(3)} to fit the height`);
            const spring = H - Math.sqrt((R + G) ** 2 - (R - a) ** 2);
            return { a, fw, hw, sill, G, R, spring, depth: p.depth, H };
        }
        a *= 0.85;
        fw *= 0.9;
        if (i === 0) warn?.("width and frameWidth: reduced to fit the height");
    }
    throw new Error("lancet: height too small for any arch");
}

export const lancet: Generator = {
    name: "lancet",
    title: "LancetWindow",
    doc: "Pointed-arch window: frame, hood mould, sill, mullions dividing it into lights, and an oculus with foiled tracery in the head.",
    material: "Stone",
    params: lancetParams,
    bounds(p) {
        const L = lancetLayout(p);
        const hx = L.a + L.fw + Math.max(L.hw, 0.08), hy = L.depth / 2 + 0.08;
        return box3(-hx, -hy, 0, hx, hy, L.H);
    },
    build(p, warn) {
        const L = lancetLayout(p, warn);
        const { a, fw, hw, sill, R, spring, depth } = L;
        const opening = section(pointedArch(a, spring, R, sill).outline);
        const outer = section(pointedArch(a, spring, R, sill * 0.5, fw).outline);
        const parts: Solid[] = [
            extrudeElevation(outer.subtract(opening), depth),
            box([-(a + fw + 0.08), -(depth / 2 + 0.06), 0], [a + fw + 0.08, depth / 2 + 0.06, sill]),
        ];
        // Hood mould: a band over the arch, stopped a little below the springline.
        const hood = section(pointedArch(a, spring, R, sill, fw + hw).outline)
            .subtract(section(pointedArch(a, spring, R, sill, fw - 0.01).outline))
            .intersect(CrossSection.square([2 * (a + fw + hw) + 1, L.H], false).translate([-(a + fw + hw) - 0.5, spring - 0.35 * a]));
        if (!hood.isEmpty()) parts.push(extrudeElevation(hood, depth + 0.16));

        // Tracery: mullions and the head, a little shallower than the frame.
        const m = clamp(0.45 * fw, 0.03, 0.4);
        const inner = section(pointedArch(a, spring, R, sill, -m).outline);
        let n = p.lights;
        let al = (2 * (a - m) - (n - 1) * m) / (2 * n);
        while (n > 1 && al < 0.06) { n--; al = (2 * (a - m) - (n - 1) * m) / (2 * n); }
        if (n < p.lights) warn(`lights: reduced to ${n} so each light stays at least 0.12 m wide`);
        const holes: Section[] = [];
        if (n === 1) {
            holes.push(inner);
        } else {
            let topOfLights = -Infinity;
            for (let i = 0; i < n; i++) {
                const x = -(a - m) + al + i * (2 * al + m);
                const light = pointedArch(al, spring, p.pointedness * 2 * al, sill);
                topOfLights = Math.max(topOfLights, light.apexZ);
                holes.push(section(light.outline).translate([x, 0]).intersect(inner));
            }
            if (p.foils > 0) {
                const lights = CrossSection.union(holes);
                const innerApex = pointedArch(a, spring, R, sill, -m).apexZ;
                let best = { z: 0, r: 0 };
                for (let i = 1; i < 48; i++) {
                    const z = topOfLights + ((innerApex - topOfLights) * i) / 48;
                    const r = Math.min(distanceToEdges(inner, 0, z), distanceToEdges(lights, 0, z) - m);
                    if (r > best.r) best = { z, r };
                }
                if (best.r > 0.06) holes.push(p.foils >= 3 ? foiled(0, best.z, best.r, p.foils) : CrossSection.circle(best.r, 32).translate([0, best.z]));
            }
        }
        const panel = section(pointedArch(a, spring, R, sill, fw * 0.5).outline).subtract(CrossSection.union(holes));
        parts.push(extrudeElevation(panel, 0.6 * depth));
        if (p.glass) parts.push(tag(extrudeElevation(opening, 0.03), "Glass"));
        return union(parts);
    },
};

// ---------------------------------------------------------------- rose window

const roseParams: ParamSpecs = {
    diameter: { default: 8, min: 1.2, max: 24, doc: "outer diameter (m)" },
    depth: { default: 0.5, min: 0.08, max: 2, doc: "rim depth (m)" },
    petals: { default: 12, min: 5, max: 32, integer: true, doc: "radial lights" },
    rimWidth: { default: 0.5, min: 0.08, max: 2, doc: "width of the outer rim (m); capped at 0.15 x diameter" },
    hub: { default: 0.2, min: 0.1, max: 0.4, doc: "hub radius as a fraction of the opening radius" },
    foils: { default: 6, min: 0, max: 12, integer: true, doc: "foils in the hub opening (0 = solid hub, 1-2 = round)" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "include glass in the 'Glass' material slot (0/1)" },
};

export const rose: Generator = {
    name: "rose",
    title: "RoseWindow",
    doc: "Rose window disc standing upright in the XZ plane: moulded rim, radial lancet lights, trefoil oculi and a foiled hub.",
    material: "Stone",
    params: roseParams,
    bounds(p) {
        const R = p.diameter / 2;
        return box3(-R, -0.6 * p.depth, 0, R, 0.6 * p.depth, 2 * R);
    },
    build(p, warn) {
        const R = p.diameter / 2, rw = Math.min(p.rimWidth, 0.15 * p.diameter), D = p.depth;
        const ri = R - rw, m = clamp(0.35 * rw, 0.03, 0.35);
        let r1 = p.hub * ri;
        let petals = p.petals;
        while (petals > 5 && r1 * Math.sin(Math.PI / petals) - m / 2 < 0.04) petals--;
        if (petals < p.petals) warn(`petals: reduced to ${petals} so each light stays at least 0.08 m wide`);
        const beta = (2 * Math.PI) / petals;
        let al = r1 * Math.sin(beta / 2) - m / 2;
        if (al < 0.04) { r1 = (0.04 + m / 2) / Math.sin(beta / 2); al = 0.04; }
        const r2 = r1 + 0.62 * Math.max(0, ri - m - r1);
        const holes: Section[] = [];
        const hubOpening = r1 - m;
        if (p.foils > 0 && hubOpening > 0.05) {
            holes.push(p.foils >= 3 ? foiled(0, 0, hubOpening, p.foils) : CrossSection.circle(hubOpening, 32));
        }
        // Lights widen outward so the spokes between them keep one width (m): half-width al at the hub,
        // al2 = spring * sin(beta/2) - m/2 at the springline, then an equilateral head peaking at r2.
        const sb = Math.sin(beta / 2);
        const spring = Math.max(r1 + 0.2 * al, (r2 + (Math.sqrt(3) * m) / 2) / (1 + Math.sqrt(3) * sb));
        const al2 = Math.max(al, spring * sb - m / 2);
        const lightOutline = pointedArch(al2, spring, 2 * al2, r1).outline;
        lightOutline[0] = [-al, r1];
        lightOutline[1] = [al, r1];
        const light = section(lightOutline);
        // Oculi beyond the light heads, sized so neighbours keep a mullion's width of stone between them.
        const wb = ri - r2 - 2 * m, s = Math.sin(beta / 2);
        const rc = Math.min(wb / 2, ((r2 + m) * s - m / 2) / (1 - s));
        for (let k = 0; k < petals; k++) {
            const theta = 90 + (360 * k) / petals;
            holes.push(light.rotate(theta - 90));
            if (rc > 0.04) {
                const c = r2 + m + rc;
                const cx = c * Math.cos(rad(theta)), cy = c * Math.sin(rad(theta));
                holes.push(rc > 0.1 ? foiled(0, 0, rc, 3).rotate(theta - 90).translate([cx, cy]) : CrossSection.circle(rc, 20).translate([cx, cy]));
            }
        }
        // Smaller oculi in the spandrels between petals, where the spokes fan out toward the rim.
        const petalCuts = CrossSection.union(holes);
        const bisector = rad(90 + 180 / petals);
        let spandrel = { rho: 0, r: 0 };
        for (let i = 0; i <= 40; i++) {
            const rho = spring + ((ri - m - spring) * i) / 40;
            const r = Math.min(distanceToEdges(petalCuts, rho * Math.cos(bisector), rho * Math.sin(bisector)) - m, ri - m - rho);
            if (r > spandrel.r) spandrel = { rho, r };
        }
        if (spandrel.r > 0.04) {
            for (let k = 0; k < petals; k++) {
                const a = bisector + k * beta, cx = spandrel.rho * Math.cos(a), cy = spandrel.rho * Math.sin(a);
                holes.push(spandrel.r > 0.12 ? foiled(0, 0, spandrel.r, 4).rotate((a * 180) / Math.PI - 90).translate([cx, cy])
                    : CrossSection.circle(spandrel.r, 16).translate([cx, cy]));
            }
        }
        const openings = CrossSection.union(holes).intersect(CrossSection.circle(ri - 0.5 * m, 96));
        const disc = (r: number) => CrossSection.circle(r, 96);
        const parts: Solid[] = [
            extrudeElevation(disc(R).subtract(disc(ri)), D), // rim
            extrudeElevation(disc(R).subtract(disc(R - 0.35 * rw)), 1.2 * D), // outer moulding
            extrudeElevation(disc(ri + 0.5 * rw).subtract(openings), 0.6 * D), // tracery
        ];
        if (p.glass) parts.push(tag(extrudeElevation(disc(ri), 0.03), "Glass"));
        return union(parts).translate([0, 0, R]);
    },
};

// ---------------------------------------------------------------- flying buttress

const buttressParams: ParamSpecs = {
    span: { default: 6, min: 1.5, max: 25, doc: "clear distance from the pier to the wall (m)" },
    height: { default: 14, min: 4, max: 60, doc: "height where the flyer's top meets the wall (m)" },
    pierWidth: { default: 1.2, min: 0.4, max: 4, doc: "pier width across the flyer (m)" },
    pierDepth: { default: 2.2, min: 0.6, max: 6, doc: "pier depth along the flyer (m)" },
    thickness: { default: 0.8, min: 0.25, max: 2.5, doc: "flyer depth at the wall (m)" },
    pinnacle: { default: 1, min: 0, max: 1, integer: true, doc: "pinnacle on top of the pier (0/1)" },
    crockets: { default: 1, min: 0, max: 1, integer: true, doc: "crockets along the flyer's coping (0/1)" },
};

function buttressLayout(p: Params) {
    const pd = p.pierDepth, pw = p.pierWidth, t = Math.min(p.thickness, 0.3 * p.height);
    const xin = pd / 2, x1 = xin + p.span;
    const tmin = 0.6 * t;
    let drop = Math.min(0.3 * p.span, 0.5 * p.height);
    let h0 = 0, zt0 = 0;
    // The intrados is a quarter ellipse: vertical where it springs from the pier, level at the wall.
    // Spring it low enough on the pier that it stays at least tmin under the straight coping.
    for (let i = 0; i < 60; i++) {
        zt0 = p.height - drop;
        h0 = 1.5 * t;
        for (let d = 1; d < 90; d++) {
            const th = rad(d), sn = Math.sin(th), cs = Math.cos(th);
            h0 = Math.max(h0, (drop * (cs + sn - 1) - t * sn + tmin) / (1 - sn));
        }
        if (zt0 - h0 >= 0.15 * p.height) break;
        drop *= 0.85;
    }
    const Hp = zt0 + 0.5 * pw;
    const wPin = 0.75 * Math.min(pw, 0.62 * pd);
    const hPin = Math.max(4.5 * wPin, 1.2);
    const setoff = Math.min(0.2 * pd, 0.25 * 0.33 * Hp);
    // Crockets on the coping, from 12% of the way up to where they would reach past the wall.
    const sc = Math.min(0.45 * t, 0.9 * pw, 0.8);
    const len = Math.hypot(x1 - xin, p.height - zt0);
    const fMax = Math.min(0.85, 1 - (1.2 * sc) / len);
    const crockets = p.crockets && fMax > 0.2 ? Math.floor(((fMax - 0.12) * len) / (2.5 * sc)) + 1 : 0;
    return { pd, pw, t, xin, x1, zt0, zb0: zt0 - h0, zb1: p.height - t, Hp, wPin, hPin, setoff, sc, fMax, crockets };
}

export const buttress: Generator = {
    name: "buttress",
    title: "FlyingButtress",
    doc: "Flying buttress: stepped pier with weathered set-offs, a half-arch flyer to the wall along +X, and a pier pinnacle. Pivot at the pier's base centre; the wall plane is x = pierDepth/2 + span.",
    material: "Stone",
    params: buttressParams,
    bounds(p) {
        const L = buttressLayout(p);
        const top = Math.max(p.height + (L.crockets ? 1.3 * L.sc : 0), p.pinnacle ? L.Hp + L.hPin : L.Hp);
        const hy = Math.max(L.pw / 2, p.pinnacle ? 0.8 * L.wPin : 0);
        return box3(-L.pd / 2, -hy, 0, L.x1, hy, top);
    },
    build(p, warn) {
        const L = buttressLayout(p);
        const { pd, pw, xin, x1, Hp, setoff } = L;
        const o0 = -pd / 2, o1 = o0 + setoff, o2 = o0 + 1.9 * setoff;
        const z1 = 0.33 * Hp, z2 = 0.66 * Hp;
        const pier: Vec2[] = [
            [o0, 0], [xin, 0], [xin, Hp], [o2, Hp], [o2, z2], [o1, z2 - (o2 - o1)], [o1, z1], [o0, z1 - (o1 - o0)],
        ];
        const x0 = xin - 0.02;
        const flyer: Vec2[] = [];
        for (let i = 0; i <= 24; i++) {
            const th = (Math.PI / 2) * (i / 24);
            flyer.push([x1 - (x1 - x0) * Math.cos(th), L.zb0 + (L.zb1 - L.zb0) * Math.sin(th)]);
        }
        flyer.push([x1, p.height], [x0, L.zt0]);
        const parts: Solid[] = [extrudeElevation(pier, pw), extrudeElevation(flyer, 0.7 * pw)];
        if (L.crockets > 0) {
            // Crocket frame: +X along the coping's upward normal, +Z up the slope toward the wall.
            const dx = x1 - x0, dz = p.height - L.zt0, alpha = (Math.atan2(dx, dz) * 180) / Math.PI;
            const proto = crocket(L.sc).rotate([0, 0, 180]).rotate([0, alpha, 0]);
            for (let i = 0; i < L.crockets; i++) {
                const f = L.crockets === 1 ? 0.5 : 0.12 + ((L.fMax - 0.12) * i) / (L.crockets - 1);
                parts.push(proto.translate([x0 + dx * f, 0, L.zt0 + dz * f]));
            }
        }
        if (p.pinnacle) {
            const pin = pinnacle.build({ height: L.hPin, width: L.wPin, crockets: 3, gablets: 1, panels: 1 }, warn);
            parts.push(pin.translate([(o2 + xin) / 2, 0, Hp - 0.02]));
        }
        return union(parts);
    },
};

// ---------------------------------------------------------------- balustrade

const balustradeParams: ParamSpecs = {
    length: { default: 3, min: 0.6, max: 12, doc: "segment length along X (m)" },
    height: { default: 1, min: 0.5, max: 2.2, doc: "height to the top of the rail (m)" },
    depth: { default: 0.3, min: 0.12, max: 0.8, doc: "plinth depth (m); the rail overhangs it a little" },
    spacing: { default: 0.3, min: 0.12, max: 1.2, doc: "baluster spacing, or tracery bay width (m)" },
    style: { default: 0, min: 0, max: 1, integer: true, doc: "0 turned balusters, 1 Gothic quatrefoil panels" },
    posts: { default: 1, min: 0, max: 1, integer: true, doc: "square end posts with caps (0/1)" },
};

function balustradeLayout(p: Params) {
    const H = p.height, D = p.depth, Lg = p.length;
    const wp = p.posts ? Math.min(clamp(1.25 * D, 0.2, 0.6), 0.25 * Lg) : 0;
    return { H, D, Lg, wp, hp: 0.16 * H, hr: 0.13 * H, top: p.posts ? 1.14 * H : H };
}

export const balustrade: Generator = {
    name: "balustrade",
    title: "Balustrade",
    doc: "Balustrade segment along X: chamfered plinth, moulded rail, turned balusters or pierced quatrefoil panels, optional end posts.",
    material: "Stone",
    params: balustradeParams,
    bounds(p) {
        const L = balustradeLayout(p);
        const hy = Math.max(0.55 * L.D, L.wp / 2);
        return box3(-L.Lg / 2, -hy, 0, L.Lg / 2, hy, L.top);
    },
    build(p) {
        const { H, D, Lg, wp, hp, hr } = balustradeLayout(p);
        const plinth: Vec2[] = [[-D / 2, 0], [D / 2, 0], [D / 2, 0.7 * hp], [0.42 * D, hp], [-0.42 * D, hp], [-D / 2, 0.7 * hp]];
        const rail: Vec2[] = [
            [-0.55 * D, H - hr], [0.55 * D, H - hr], [0.55 * D, H - 0.45 * hr], [0.38 * D, H], [-0.38 * D, H], [-0.55 * D, H - 0.45 * hr],
        ];
        const parts: Solid[] = [extrudeAlongX(plinth, -Lg / 2, Lg / 2), extrudeAlongX(rail, -Lg / 2, Lg / 2)];
        const x0 = -Lg / 2 + wp, x1 = Lg / 2 - wp, clear = x1 - x0;
        const z0 = hp - 0.01, hb = H - hr + 0.01 - z0;
        if (p.style === 0) {
            const nb = Math.max(1, Math.round(clear / p.spacing));
            const pitch = clear / nb;
            const rb = Math.min(0.36 * pitch, 0.42 * D);
            const shape: Vec2[] = [
                [0, 0], [0.95, 0], [0.95, 0.07], [0.6, 0.11], [0.52, 0.18], [0.8, 0.34], [0.92, 0.46], [0.7, 0.62],
                [0.4, 0.74], [0.36, 0.8], [0.62, 0.86], [0.7, 0.93], [0.7, 1], [0, 1],
            ];
            const baluster = lathe(shape.map(([r, z]) => [r * rb, z * hb] as Vec2), 12).translate([0, 0, z0]);
            for (let i = 0; i < nb; i++) parts.push(baluster.translate([x0 + pitch * (i + 0.5), 0, 0]));
        } else {
            const panelH = hb;
            const bays = Math.max(1, Math.round(clear / Math.max(p.spacing, 0.85 * panelH)));
            const bw = clear / bays;
            const ro = 0.42 * Math.min(bw, panelH);
            const holes: Section[] = [];
            for (let i = 0; i < bays; i++) holes.push(foiled(x0 + bw * (i + 0.5), z0 + panelH / 2, ro, 4));
            const pad = wp > 0 ? 0.01 : 0; // sink into the posts, but never past the segment's ends
            const panel = CrossSection.square([clear + 2 * pad, panelH], false).translate([x0 - pad, z0]).subtract(CrossSection.union(holes));
            parts.push(extrudeElevation(panel, 0.4 * D));
        }
        if (p.posts) {
            for (const xc of [-Lg / 2 + wp / 2, Lg / 2 - wp / 2]) {
                parts.push(box([xc - wp / 2, -wp / 2, 0], [xc + wp / 2, wp / 2, 1.06 * H]));
                parts.push(extrude(ngon(4, wp * Math.SQRT1_2, 45), 0.08 * H, 0.15).translate([xc, 0, 1.06 * H]));
            }
        }
        return union(parts);
    },
};

// ---------------------------------------------------------------- street lamp

const lampParams: ParamSpecs = {
    height: { default: 4.2, min: 2, max: 12, doc: "overall height (m)" },
    arms: { default: 0, min: 0, max: 4, integer: true, doc: "0 = lantern on the post; 1-4 = bracket arms, one lantern each" },
    lanternSize: { default: 0.6, min: 0.2, max: 1.5, doc: "lantern height including its roof (m); capped at 0.3 x height" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "include lantern glass in the 'Glass' material slot (0/1)" },
};

function lampLayout(p: Params) {
    const H = p.height, ls = Math.min(p.lanternSize, 0.3 * H);
    const b = clamp(0.055 * H, 0.12, 0.45);
    const reach = 0.35 + 0.9 * ls;
    return { H, ls, b, reach, rl: 0.42 * ls };
}

/** A hexagonal lantern from z = 0 to ls: cup, tapered glass, corner posts, flared roof, finial. */
function lantern(ls: number, glass: boolean): Solid {
    const parts: Solid[] = [
        lathe([[0, 0], [0.16 * ls, 0], [0.3 * ls, 0.12 * ls], [0.3 * ls, 0.16 * ls], [0, 0.16 * ls]], 6),
        lathe([[0, 0.68 * ls], [0.42 * ls, 0.68 * ls], [0.42 * ls, 0.72 * ls], [0.12 * ls, 0.9 * ls], [0.05 * ls, 0.93 * ls], [0, 0.93 * ls]], 6),
        lathe([[0, 0.9 * ls], [0.06 * ls, 0.9 * ls], [0.07 * ls, 0.95 * ls], [0.03 * ls, 0.98 * ls], [0, ls]], 8),
    ];
    for (let k = 0; k < 6; k++) {
        const a = rad(60 * k), c = Math.cos(a), s = Math.sin(a);
        parts.push(sweep(ngon(6, 0.022 * ls), [[0.25 * ls * c, 0.25 * ls * s, 0.14 * ls], [0.29 * ls * c, 0.29 * ls * s, 0.7 * ls]]));
    }
    const pane = lathe([[0, 0.15 * ls], [0.25 * ls, 0.15 * ls], [0.29 * ls, 0.69 * ls], [0, 0.69 * ls]], 6);
    parts.push(glass ? tag(pane, "Glass") : pane);
    return union(parts);
}

export const lamp: Generator = {
    name: "lamp",
    title: "StreetLamp",
    doc: "Cast-iron street lamp: turned base and shaft, and either one lantern on top or 1-4 swan-neck arms with a lantern each.",
    material: "Iron",
    params: lampParams,
    bounds(p) {
        const L = lampLayout(p);
        const half = p.arms > 0 ? L.reach + L.rl : Math.max(L.b, L.rl);
        return box3(-half, -half, 0, half, half, L.H);
    },
    sockets(p) {
        const L = lampLayout(p);
        if (p.arms === 0) return { light0: [0, 0, L.H - 0.58 * L.ls] };
        const out: Record<string, Vec3> = {};
        for (let j = 0; j < p.arms; j++) {
            const a = rad((360 * j) / p.arms);
            out[`light${j}`] = [L.reach * Math.cos(a), L.reach * Math.sin(a), L.H - 0.02 - 0.58 * L.ls];
        }
        return out;
    },
    build(p) {
        const { H, ls, b, reach } = lampLayout(p);
        const zTop = p.arms === 0 ? H - ls + 0.02 : H - 0.25 * ls;
        const zc = 3 * b + 0.45 * (zTop - 3 * b); // collar
        const post: Vec2[] = [
            [0, 0], [b, 0], [b, 0.35 * b], [0.82 * b, 0.45 * b], [0.82 * b, 1.4 * b], [0.6 * b, 1.8 * b], [0.6 * b, 2.3 * b],
            [0.45 * b, 2.6 * b], [0.36 * b, 3 * b], [0.3 * b, zc - 0.12 * b], [0.42 * b, zc], [0.3 * b, zc + 0.12 * b],
            [0.26 * b, zTop - 0.5 * b], [0.4 * b, zTop - 0.25 * b], [0.48 * b, zTop], [0, zTop],
        ];
        const parts: Solid[] = [lathe(post, 12)];
        if (p.arms === 0) {
            parts.push(lantern(ls, !!p.glass).translate([0, 0, H - ls]));
        } else {
            parts.push(lathe([[0, zTop - 0.01], [0.3 * b, zTop - 0.01], [0.3 * b, zTop + 0.25 * (H - zTop)], [0.12 * b, zTop + 0.6 * (H - zTop)], [0, H]], 12));
            const ze = H - 0.02 - ls, za = ze - 0.55 * ls;
            const bar = clamp(0.03 * Math.sqrt(H / 4.2), 0.015, 0.06);
            const arm: Vec3[] = [], brace: Vec3[] = [];
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                arm.push([reach * t, 0, za + (ze - za) * Math.sin((t * Math.PI) / 2)]);
                const th = (Math.PI / 2) * t;
                const xb = 0.6 * reach * (1 - Math.cos(th));
                const zArm = za + (ze - za) * Math.sin((xb / reach) * (Math.PI / 2));
                brace.push([xb, 0, za - 0.5 * ls + (zArm - 0.01 - (za - 0.5 * ls)) * Math.sin(th)]);
            }
            const one = union([
                sweep(ngon(8, bar), arm),
                sweep(ngon(8, 0.7 * bar), brace),
                lantern(ls, !!p.glass).translate([reach, 0, ze]),
            ]);
            for (let j = 0; j < p.arms; j++) parts.push(one.rotate([0, 0, (360 * j) / p.arms]));
        }
        return union(parts);
    },
};

export const GENERATORS: Record<string, Generator> = { spire, pinnacle, lancet, rose, buttress, balustrade, lamp };
