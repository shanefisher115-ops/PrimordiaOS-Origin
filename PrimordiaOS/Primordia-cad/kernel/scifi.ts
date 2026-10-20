// Parametric sci-fi spires: arcology towers, energy pylons, habitat domes and comms masts.
// Same conventions as gothic.ts: metres, Z up, pivot at the base centre (z = 0 is the ground), pure functions
// of plain numeric params. Untagged triangles take the generator's material; glowing parts are tagged "Glass"
// (window bands, rings, beacons) and metal parts "Iron", so the three material slots read as hull / light / metal.
import { Manifold, tag } from "./manifold.ts";
import type { Solid } from "./manifold.ts";
import { box, extrude, lathe, ngon, sweep, union } from "./ops.ts";
import type { Vec2, Vec3 } from "./ops.ts";
import type { Box } from "./mesh.ts";
import { clamp } from "./params.ts";
import type { ParamSpecs, Params } from "./params.ts";
import type { Generator } from "./gothic.ts";

const box3 = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box => ({ min: [x0, y0, z0], max: [x1, y1, z1] });
const rad = (deg: number) => (deg * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** n-sided prism of circumradius r from z0 to z1 (flats facing the axes), optionally tapered. */
function prism(n: number, r: number, z0: number, z1: number, scaleTop = 1): Solid {
    return extrude(ngon(n, r, 180 / n), z1 - z0, scaleTop).translate([0, 0, z0]);
}

/** Flat annulus from radius ri to ro, z0 to z1. */
function ring(ri: number, ro: number, z0: number, z1: number, segments = 48): Solid {
    return lathe([[ri, z0], [ro, z0], [ro, z1], [ri, z1]], segments);
}

const glazed = (s: Solid, glass: number) => (glass ? tag(s, "Glass") : s);

// ---------------------------------------------------------------- arcology spire

const arcologyParams: ParamSpecs = {
    height: { default: 120, min: 20, max: 400, doc: "overall height to the needle tip (m)" },
    baseWidth: { default: 30, min: 6, max: 80, doc: "width across the flats of the lowest tier (m)" },
    sides: { default: 6, min: 3, max: 12, integer: true, doc: "sides of every tier (6 = hexagonal)" },
    tiers: { default: 4, min: 1, max: 8, integer: true, doc: "set-back tiers" },
    taper: { default: 0.55, min: 0.2, max: 0.95, doc: "top tier width / lowest tier width" },
    floorHeight: { default: 4, min: 2.5, max: 10, doc: "storey height: a hull slab over a glowing window band (m)" },
    glassRatio: { default: 0.4, min: 0.1, max: 0.8, doc: "share of each storey that is window band" },
    needle: { default: 0.15, min: 0, max: 0.4, doc: "needle height as a share of the overall height" },
    ring: { default: 1, min: 0, max: 1, integer: true, doc: "halo ring deck around the top tier (0/1)" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "window bands and beacon in the 'Glass' material slot (0/1)" },
};

function arcologyLayout(p: Params) {
    const H = p.height, n = p.sides;
    const R0 = p.baseWidth / 2 / Math.cos(Math.PI / n); // circumradius of the lowest tier
    const hn = p.needle * H, hb = H - hn;
    const hp = clamp(0.03 * H, 0.8, 6); // podium
    const tierH = (hb - hp) / p.tiers;
    const R = (t: number) => R0 * (1 - (1 - p.taper) * (p.tiers === 1 ? 0 : t / (p.tiers - 1)));
    const rTop = R(p.tiers - 1);
    const tr = clamp(0.012 * H, 0.3, 3); // ring deck thickness
    return { H, n, R0, hn, hb, hp, tierH, R, rTop, Rp: 1.12 * R0, ringRi: 1.38 * rTop, ringRo: 1.6 * rTop, tr, zr: hb - 0.4 * tierH };
}

export const arcology: Generator = {
    name: "arcology",
    title: "ArcologySpire",
    prefix: "SciFi",
    doc: "Arcology spire: a podium, set-back polygonal tiers of hull slabs over glowing window bands, an optional halo ring deck, and a needle with a beacon.",
    material: "Stone",
    params: arcologyParams,
    bounds(p) {
        const L = arcologyLayout(p);
        const half = Math.max(L.Rp, p.ring ? L.ringRo : 0);
        return box3(-half, -half, 0, half, half, L.H);
    },
    sockets(p) {
        const L = arcologyLayout(p);
        return { tip: [0, 0, L.H], beacon: [0, 0, L.hb + 0.45 * L.hn], ring: [0, 0, L.zr + L.tr] };
    },
    build(p) {
        const L = arcologyLayout(p);
        const { n, hp, tierH } = L;
        const parts: Solid[] = [prism(n, L.Rp, 0, hp)];
        for (let t = 0; t < p.tiers; t++) {
            const r = L.R(t), z0 = hp + t * tierH;
            const floors = Math.max(1, Math.round(tierH / p.floorHeight));
            const fh = tierH / floors, gh = p.glassRatio * fh, d = 0.002 * fh;
            for (let f = 0; f < floors; f++) {
                const zf = z0 + f * fh;
                parts.push(glazed(prism(n, 0.94 * r, zf - d, zf + gh), p.glass));
                parts.push(prism(n, r, zf + gh - d, zf + fh));
            }
        }
        if (L.hn > 0) {
            const rn = clamp(0.18 * L.rTop, 0.15, 0.5 * L.rTop);
            parts.push(tag(lathe([[0, L.hb - 0.01], [rn, L.hb - 0.01], [0.55 * rn, L.hb + 0.35 * L.hn], [0.12 * rn, L.H - 0.05 * L.hn], [0, L.H]], 12), "Iron"));
            parts.push(glazed(Manifold.sphere(0.9 * rn, 16).translate([0, 0, L.hb + 0.45 * L.hn]), p.glass));
        }
        if (p.ring) {
            const { ringRi: ri, ringRo: ro, tr, zr, rTop } = L;
            const deck = [ring(ri, ro, zr, zr + tr)];
            const w = 0.18 * (ro - ri);
            deck.push(glazed(ring(ri + w, ro - w, zr + tr - 0.01, zr + 1.12 * tr), p.glass));
            const struts = Math.min(6, Math.max(3, n));
            for (let k = 0; k < struts; k++) {
                const a = rad(360 * k / struts + 180 / n);
                const c = Math.cos(a), s = Math.sin(a);
                deck.push(sweep(ngon(4, 0.35 * tr), [[0.4 * rTop * c, 0.4 * rTop * s, zr + tr / 2], [1.02 * ri * c, 1.02 * ri * s, zr + tr / 2]]));
            }
            parts.push(tag(union(deck), "Iron"));
        }
        return union(parts);
    },
};

// ---------------------------------------------------------------- energy pylon

const pylonParams: ParamSpecs = {
    height: { default: 14, min: 3, max: 60, doc: "overall height to the top of the emitter (m)" },
    legs: { default: 3, min: 3, max: 6, integer: true, doc: "splayed legs" },
    spread: { default: 0.3, min: 0.12, max: 0.5, doc: "foot circle radius as a share of the height" },
    core: { default: 0.06, min: 0.02, max: 0.12, doc: "core radius as a share of the height" },
    rings: { default: 3, min: 0, max: 8, integer: true, doc: "glowing rings around the core" },
    fins: { default: 0, min: 0, max: 8, integer: true, doc: "vertical cooling fins on the core" },
    emitter: { default: 1, min: 0, max: 1, integer: true, doc: "glowing emitter orb on top (0/1)" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "rings and orb in the 'Glass' material slot (0/1)" },
};

function pylonLayout(p: Params) {
    const H = p.height, rc = p.core * H, rf = p.spread * H;
    const lw = clamp(0.025 * H, 0.06, 1.2); // leg half-thickness
    const re = p.emitter ? clamp(1.8 * rc, 0.15, 0.12 * H) : 0;
    const coreTop = H - 2 * re * (p.emitter ? 0.85 : 0);
    return { H, rc, rf, lw, re, coreTop, zj: 0.42 * H, ringR: 1.9 * rc, finR: 2.2 * rc };
}

export const pylon: Generator = {
    name: "pylon",
    title: "EnergyPylon",
    prefix: "SciFi",
    doc: "Energy pylon: splayed metal legs on foot pads, a hull core with glowing rings and optional fins, and an emitter orb.",
    material: "Stone",
    params: pylonParams,
    bounds(p) {
        const L = pylonLayout(p);
        const half = Math.max(L.rf + 1.5 * L.lw * Math.SQRT2, L.ringR, p.fins ? L.finR * 1.01 : 0, L.re, 1.3 * L.rc);
        return box3(-half, -half, 0, half, half, L.H);
    },
    sockets(p) {
        const L = pylonLayout(p);
        return { emitter: [0, 0, L.H - L.re], top: [0, 0, L.H] };
    },
    build(p) {
        const L = pylonLayout(p);
        const { H, rc, rf, lw, re, coreTop, zj } = L;
        const parts: Solid[] = [
            lathe([[0, 0], [1.3 * rc, 0], [1.3 * rc, 0.04 * H], [rc, 0.08 * H], [rc, coreTop - 0.06 * H], [0.7 * rc, coreTop], [0, coreTop]], 24),
        ];
        const legs: Solid[] = [];
        for (let k = 0; k < p.legs; k++) {
            const a = rad(360 * k / p.legs), c = Math.cos(a), s = Math.sin(a);
            const fx = rf * c, fy = rf * s, jx = 0.6 * rc * c, jy = 0.6 * rc * s;
            const pts: Vec3[] = [];
            for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
                pts.push([fx + dx * lw, fy + dy * lw, 0], [fx + dx * lw, fy + dy * lw, 0.5 * lw]);
                pts.push([jx + dx * 0.6 * lw, jy + dy * 0.6 * lw, zj - 0.6 * lw], [jx + dx * 0.6 * lw, jy + dy * 0.6 * lw, zj + 0.6 * lw]);
            }
            legs.push(Manifold.hull(pts));
            parts.push(box([fx - 1.5 * lw, fy - 1.5 * lw, 0], [fx + 1.5 * lw, fy + 1.5 * lw, 0.6 * lw]));
        }
        parts.push(tag(union(legs), "Iron"));
        const rt = clamp(0.012 * H, 0.04, 0.6);
        for (let i = 0; i < p.rings; i++) {
            const z = coreTop * (0.4 + (0.5 * (i + 0.5)) / p.rings);
            parts.push(glazed(ring(0.95 * rc, L.ringR, z, z + rt), p.glass));
        }
        if (p.fins) {
            const t = Math.max(0.02, 0.12 * rc);
            const fins: Solid[] = [];
            for (let j = 0; j < p.fins; j++) {
                fins.push(box([0.9 * rc, -t, 0.15 * H], [L.finR, t, 0.55 * coreTop]).rotate([0, 0, 360 * j / p.fins + 180 / p.fins]));
            }
            parts.push(tag(union(fins), "Iron"));
        }
        if (p.emitter) {
            parts.push(tag(lathe([[0, coreTop - 0.02], [0.8 * re, coreTop - 0.02], [0.6 * re, coreTop + 0.45 * re], [0, coreTop + 0.45 * re]], 24), "Iron"));
            parts.push(glazed(Manifold.sphere(re, 24).translate([0, 0, H - re]), p.glass));
        }
        return union(parts);
    },
};

// ---------------------------------------------------------------- habitat dome

const domeParams: ParamSpecs = {
    diameter: { default: 16, min: 3, max: 80, doc: "dome diameter (m)" },
    rise: { default: 0.6, min: 0.2, max: 1, doc: "dome height / radius (1 = hemisphere)" },
    baseHeight: { default: 1.5, min: 0.3, max: 10, doc: "height of the base ring (m); capped at half the radius" },
    ribs: { default: 8, min: 0, max: 24, integer: true, doc: "metal meridian ribs over the glazing" },
    rings: { default: 2, min: 0, max: 6, integer: true, doc: "metal horizontal frame rings" },
    airlocks: { default: 1, min: 0, max: 4, integer: true, doc: "airlock tunnels out of the base" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "dome glazing in the 'Glass' material slot (0/1)" },
};

function domeLayout(p: Params) {
    const R = p.diameter / 2, bh = Math.min(p.baseHeight, 0.5 * R), dh = p.rise * R;
    const hubH = clamp(0.05 * R, 0.1, 2), rh = clamp(0.07 * R, 0.12, 3);
    const La = clamp(0.3 * R, 1.2, 10), wa = clamp(0.18 * R, 0.6, 6), ha = Math.min(clamp(0.22 * R, 1.2, 5), bh + 0.6 * dh);
    return { R, bh, dh, hubH, rh, La, wa, ha, Rb: 1.06 * R, top: bh + dh + hubH, w: clamp(0.012 * R, 0.03, 0.6) };
}

/** Solid half-spheroid cap from z = bh up, radius r, height h (a little below bh so it fuses with the base). */
function cap(r: number, h: number, bh: number, segments = 48): Solid {
    const prof: Vec2[] = [[0, bh - 0.01], [r, bh - 0.01]];
    for (let i = 1; i < 16; i++) { const t = (i / 16) * (Math.PI / 2); prof.push([r * Math.cos(t), bh + h * Math.sin(t)]); }
    prof.push([0, bh + h]);
    return lathe(prof, segments);
}

export const dome: Generator = {
    name: "dome",
    title: "HabitatDome",
    prefix: "SciFi",
    doc: "Habitat dome: a base ring, a glazed spheroid dome with metal meridian ribs and frame rings, a top hub, and airlock tunnels.",
    material: "Stone",
    params: domeParams,
    bounds(p) {
        const L = domeLayout(p);
        const half = Math.max(L.Rb, p.airlocks ? Math.hypot(L.R + L.La, 1.1 * L.wa) : 0);
        return box3(-half, -half, 0, half, half, L.top);
    },
    sockets(p) {
        const L = domeLayout(p);
        return { hub: [0, 0, L.top], centre: [0, 0, L.bh] };
    },
    build(p) {
        const L = domeLayout(p);
        const { R, bh, dh, w } = L;
        const parts: Solid[] = [
            lathe([[0, 0], [L.Rb, 0], [L.Rb, 0.85 * bh], [R, bh], [0, bh]], 48),
            glazed(cap(R, dh, bh), p.glass),
        ];
        const frame: Solid[] = [];
        if (p.ribs || p.rings) {
            const outer = cap(1.02 * R, 1.025 * dh, bh);
            for (let k = 0; k < p.ribs; k++) {
                frame.push(outer.intersect(box([0, -w, bh - 0.02], [1.1 * R, w, bh + 1.1 * dh]).rotate([0, 0, 360 * k / p.ribs])));
            }
            for (let j = 0; j < p.rings; j++) {
                const z = bh + 0.9 * dh * (j + 1) / (p.rings + 1);
                frame.push(outer.intersect(box([-1.1 * R, -1.1 * R, z], [1.1 * R, 1.1 * R, z + w])));
            }
        }
        frame.push(lathe([[0, bh + 0.97 * dh], [L.rh, bh + 0.97 * dh], [L.rh, L.top], [0, L.top]], 24));
        parts.push(tag(union(frame), "Iron"));
        for (let a = 0; a < p.airlocks; a++) {
            const turn = 360 * a / p.airlocks + 22.5;
            parts.push(box([0.7 * R, -L.wa, 0], [R + L.La, L.wa, L.ha]).rotate([0, 0, turn]));
            parts.push(tag(box([R + 0.95 * L.La, -1.1 * L.wa, 0], [R + L.La, 1.1 * L.wa, 1.08 * L.ha]).rotate([0, 0, turn]), "Iron"));
        }
        return union(parts);
    },
};

// ---------------------------------------------------------------- comms mast

const mastParams: ParamSpecs = {
    height: { default: 30, min: 6, max: 120, doc: "overall height to the top of the antenna (m)" },
    baseWidth: { default: 2.4, min: 0.5, max: 10, doc: "lattice width at the base (m); capped at 0.15 x height" },
    sections: { default: 4, min: 1, max: 10, integer: true, doc: "stacked lattice sections, each with a platform" },
    taper: { default: 0.45, min: 0.15, max: 1, doc: "top width / base width" },
    dishes: { default: 2, min: 0, max: 6, integer: true, doc: "parabolic dishes on arms" },
    dishSize: { default: 2.2, min: 0.4, max: 8, doc: "dish diameter (m); capped at 0.25 x height" },
    arrays: { default: 4, min: 0, max: 8, integer: true, doc: "antenna rods on the top platform" },
    beacon: { default: 1, min: 0, max: 1, integer: true, doc: "glowing beacon on the antenna tip (0/1)" },
    glass: { default: 1, min: 0, max: 1, integer: true, doc: "beacon in the 'Glass' material slot (0/1)" },
};

function mastLayout(p: Params) {
    const H = p.height, w0 = Math.min(p.baseWidth, 0.15 * H) / 2, wt = w0 * p.taper;
    const hp = clamp(0.03 * H, 0.3, 2), hBody = 0.82 * H, secH = (hBody - hp) / p.sections;
    const rd = Math.min(p.dishSize, 0.25 * H) / 2, depth = 0.35 * rd, t = clamp(0.04 * rd, 0.02, 0.2), arm = clamp(0.3 * rd, 0.2, 2);
    const rb = p.beacon ? clamp(0.012 * H, 0.08, 1) : 0;
    const width = (z: number) => lerp(w0, wt, clamp((z - hp) / (hBody - hp), 0, 1));
    const d0 = (z: number) => 1.2 * width(z) + arm;
    const dishReach = Math.hypot(1.2 * w0 + arm + Math.max(depth + t, 1.6 * depth), rd);
    return { H, w0, wt, hp, hBody, secH, rd, depth, t, arm, rb, width, d0, dishReach, rr: clamp(0.004 * H, 0.02, 0.2) };
}

/** Parabolic dish facing +X, its back at the origin: rim radius rd, cup depth, shell thickness t, feed horn. */
function dish(rd: number, depth: number, t: number): Solid {
    const outer: Vec2[] = [], inner: Vec2[] = [];
    for (let j = 0; j <= 10; j++) {
        const r = (rd * j) / 10, z = depth * (r / rd) ** 2;
        outer.push([r, z]);
        inner.unshift([r, z + t]);
    }
    const cup = lathe([...outer, ...inner], 32).rotate([0, 90, 0]);
    const horn = sweep(ngon(6, 0.8 * t), [[0.5 * t, 0, 0], [1.6 * depth, 0, 0]]);
    return union([cup, horn]);
}

export const mast: Generator = {
    name: "mast",
    title: "CommsMast",
    prefix: "SciFi",
    doc: "Comms mast: a plinth, stacked tapering lattice sections with platforms, parabolic dishes on arms, an antenna array and a beacon.",
    material: "Iron",
    params: mastParams,
    bounds(p) {
        const L = mastLayout(p);
        const half = Math.max(1.6 * L.w0, 1.3 * L.w0, p.dishes ? L.dishReach : 0, 0.75 * L.wt + L.rr);
        return box3(-half, -half, 0, half, half, L.H);
    },
    sockets(p) {
        const L = mastLayout(p);
        return { tip: [0, 0, L.H], beacon: [0, 0, L.H - L.rb], platform: [0, 0, L.hBody] };
    },
    build(p) {
        const L = mastLayout(p);
        const { H, w0, wt, hp, hBody, secH } = L;
        const parts: Solid[] = [tag(box([-1.6 * w0, -1.6 * w0, 0], [1.6 * w0, 1.6 * w0, hp]), "Stone")];
        const lw = Math.max(0.025, 0.08 * w0), bw = 0.5 * lw;
        for (let s = 0; s < p.sections; s++) {
            const z0 = hp + s * secH - 0.01, z1 = hp + (s + 1) * secH;
            const wa = lerp(w0, wt, s / p.sections), wb = lerp(w0, wt, (s + 1) / p.sections);
            const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (const [sx, sy] of corners) {
                const pts: Vec3[] = [];
                for (const [dx, dy] of corners) {
                    pts.push([sx * wa + dx * lw, sy * wa + dy * lw, z0], [sx * wb + dx * lw, sy * wb + dy * lw, z1]);
                }
                parts.push(Manifold.hull(pts));
            }
            for (let f = 0; f < 4; f++) { // X bracing on each face
                const [ax, ay] = corners[f], [bx, by] = corners[(f + 1) % 4];
                parts.push(sweep(ngon(4, bw), [[ax * wa, ay * wa, z0 + lw], [bx * wb, by * wb, z1 - lw]]));
                parts.push(sweep(ngon(4, bw), [[bx * wa, by * wa, z0 + lw], [ax * wb, ay * wb, z1 - lw]]));
            }
            const pt = clamp(0.06 * secH, 0.05, 0.4);
            parts.push(box([-1.3 * wb, -1.3 * wb, z1 - pt], [1.3 * wb, 1.3 * wb, z1]));
        }
        // Antenna and beacon
        const r0 = clamp(0.25 * wt, 0.03, 0.4), rodTop = H - 2 * L.rb * 0.9;
        parts.push(lathe([[0, hBody - 0.05], [r0, hBody - 0.05], [0.4 * r0, rodTop], [0, rodTop]], 8));
        if (p.beacon) parts.push(glazed(Manifold.sphere(L.rb, 16).translate([0, 0, H - L.rb]), p.glass));
        for (let k = 0; k < p.arrays; k++) {
            const a = rad(360 * k / p.arrays + 45), len = (0.05 + 0.035 * (k % 3)) * H;
            parts.push(extrude(ngon(6, L.rr), len + 0.05).translate([0.75 * wt * Math.cos(a), 0.75 * wt * Math.sin(a), hBody - 0.05]));
        }
        // Dishes on arms, spread up the mast
        for (let i = 0; i < p.dishes; i++) {
            const zd = lerp(0.3 * hBody, 0.9 * hBody, p.dishes === 1 ? 0.6 : i / (p.dishes - 1));
            const turn = 360 * i / Math.max(1, p.dishes) * 0.75 + 45;
            const d0 = L.d0(zd);
            const armBar = sweep(ngon(4, Math.max(0.03, 0.6 * lw)), [[0, 0, 0], [d0 + 0.5 * L.t, 0, 0]]);
            const unit = union([armBar, tag(dish(L.rd, L.depth, L.t).translate([d0, 0, 0]), "Stone")]);
            parts.push(unit.translate([0, 0, zd]).rotate([0, 0, turn]));
        }
        return union(parts);
    },
};

export const SCIFI: Record<string, Generator> = { arcology, pylon, dome, mast };
