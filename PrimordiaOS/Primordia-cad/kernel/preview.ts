// Headless preview renderer: rasterises render meshes into a PNG (z-buffer, smooth normals, a key light,
// sky/ground fill). It needs no GPU or Unreal, so agents tuning parameters can look at what they made.
import { deflateSync } from "node:zlib";
import type { Geometry } from "./index.ts";

const COLORS: Record<string, [number, number, number]> = {
    Stone: [0.78, 0.74, 0.68],
    Glass: [1.0, 0.72, 0.32],
    Iron: [0.22, 0.23, 0.26],
};

export interface PreviewOptions { size?: number; yaw?: number; pitch?: number }

/** Renders one or more geometries into a grid of square tiles (each framed on its own). */
export function previewPNG(items: Geometry[], opts: PreviewOptions & { columns?: number } = {}): Uint8Array {
    const size = opts.size ?? 384, cols = Math.min(items.length, opts.columns ?? 3), rows = Math.ceil(items.length / cols);
    const W = cols * size, H = rows * size;
    const rgb = new Float32Array(W * H * 3);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const t = (y % size) / size; // background: dusk gradient per tile
            rgb.set([0.16 + 0.1 * t, 0.17 + 0.1 * t, 0.22 + 0.08 * t], (y * W + x) * 3);
        }
    }
    items.forEach((g, i) => renderTile(g, rgb, W, (i % cols) * size, Math.floor(i / cols) * size, size, opts));
    return encodePNG(rgb, W, H);
}

function renderTile(g: Geometry, rgb: Float32Array, W: number, ox: number, oy: number, size: number, opts: PreviewOptions) {
    const yaw = ((opts.yaw ?? -35) * Math.PI) / 180, pitch = ((opts.pitch ?? 18) * Math.PI) / 180;
    // Camera looks along -forward; view basis from yaw (about Z) and pitch.
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const right = [cy, sy, 0];
    const fwd = [-sy * cp, cy * cp, -sp]; // into the screen
    const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    const r = g.render, n = r.positions.length / 3;
    const sx = new Float32Array(n), syy = new Float32Array(n), sz = new Float32Array(n);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
        const p = [r.positions[i * 3], r.positions[i * 3 + 1], r.positions[i * 3 + 2]];
        sx[i] = p[0] * right[0] + p[1] * right[1] + p[2] * right[2];
        syy[i] = -(p[0] * up[0] + p[1] * up[1] + p[2] * up[2]);
        sz[i] = p[0] * fwd[0] + p[1] * fwd[1] + p[2] * fwd[2];
        minX = Math.min(minX, sx[i]); maxX = Math.max(maxX, sx[i]); minY = Math.min(minY, syy[i]); maxY = Math.max(maxY, syy[i]);
    }
    const scale = (0.86 * size) / Math.max(maxX - minX, maxY - minY, 1e-6);
    const cx0 = ox + size / 2 - ((minX + maxX) / 2) * scale, cy0 = oy + size / 2 - ((minY + maxY) / 2) * scale;
    for (let i = 0; i < n; i++) { sx[i] = sx[i] * scale + cx0; syy[i] = syy[i] * scale + cy0; }
    const depth = new Float32Array(size * size).fill(Infinity);
    const light = norm3([-0.45, -0.6, 0.66]);
    for (const group of r.groups) {
        const base = COLORS[group.material] ?? COLORS.Stone;
        const glow = group.material === "Glass";
        for (let t = group.start; t < group.start + group.count; t += 3) {
            const a = r.indices[t], b = r.indices[t + 1], c = r.indices[t + 2];
            const area = (sx[b] - sx[a]) * (syy[c] - syy[a]) - (sx[c] - sx[a]) * (syy[b] - syy[a]);
            if (area >= 0) continue; // back face (screen y points down, so front faces are negative)
            const x0 = Math.max(ox, Math.floor(Math.min(sx[a], sx[b], sx[c]))), x1 = Math.min(ox + size - 1, Math.ceil(Math.max(sx[a], sx[b], sx[c])));
            const y0 = Math.max(oy, Math.floor(Math.min(syy[a], syy[b], syy[c]))), y1 = Math.min(oy + size - 1, Math.ceil(Math.max(syy[a], syy[b], syy[c])));
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    const px = x + 0.5, py = y + 0.5;
                    const w0 = ((sx[b] - px) * (syy[c] - py) - (sx[c] - px) * (syy[b] - py)) / area;
                    const w1 = ((sx[c] - px) * (syy[a] - py) - (sx[a] - px) * (syy[c] - py)) / area;
                    const w2 = 1 - w0 - w1;
                    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                    const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
                    const di = (y - oy) * size + (x - ox);
                    if (z >= depth[di]) continue;
                    depth[di] = z;
                    const nn = norm3([0, 1, 2].map((k) => w0 * r.normals[a * 3 + k] + w1 * r.normals[b * 3 + k] + w2 * r.normals[c * 3 + k]));
                    const diffuse = Math.max(0, nn[0] * light[0] + nn[1] * light[1] + nn[2] * light[2]);
                    const sky = 0.5 + 0.5 * nn[2];
                    const k = glow ? 1.1 : 0.22 + 0.22 * sky + 0.75 * diffuse;
                    rgb.set([base[0] * k, base[1] * k, base[2] * k], (y * W + x) * 3);
                }
            }
        }
    }
}

function norm3(v: number[]): number[] {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function encodePNG(rgb: Float32Array, W: number, H: number): Uint8Array {
    const raw = new Uint8Array(H * (W * 3 + 1));
    for (let y = 0; y < H; y++) {
        raw[y * (W * 3 + 1)] = 0;
        for (let x = 0; x < W * 3; x++) {
            const v = Math.pow(Math.min(1, Math.max(0, rgb[y * W * 3 + x])), 1 / 2.2); // linear -> sRGB-ish
            raw[y * (W * 3 + 1) + 1 + x] = Math.round(v * 255);
        }
    }
    const chunk = (type: string, data: Uint8Array) => {
        const out = new Uint8Array(12 + data.length);
        const dv = new DataView(out.buffer);
        dv.setUint32(0, data.length);
        out.set(new TextEncoder().encode(type), 4);
        out.set(data, 8);
        dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
        return out;
    };
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, W); dv.setUint32(4, H);
    ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))];
    const total = parts.reduce((s, p) => s + p.length, 0);
    const png = new Uint8Array(total);
    let at = 0;
    for (const p of parts) { png.set(p, at); at += p.length; }
    return png;
}
