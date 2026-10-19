"""Approximates normal and roughness maps from a building's diffuse (colour) texture.

Brightness stands in for height: carved lines and mortar are dark, so they become recesses.
Large-scale brightness is high-passed away so whole stones don't tilt, and glass (the dark
navy parts) stays flat and glossy. Normals use Unreal's DirectX convention (green = down).

Usage (outside Unreal; needs numpy and pillow):
    python derive_surface_maps.py <diffuse.png> <normal_out.png> <roughness_out.png>

Import the normal map with TC_Normalmap and the roughness map with TC_Masks, both with sRGB off.
"""
import sys

import numpy as np
from PIL import Image

src, out_normal, out_rough = sys.argv[1:4]
STRENGTH = 4.0

rgb = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255.0
lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
glass = np.clip((0.22 - lum) / 0.08, 0.0, 1.0)


def box(a, r):
    """Separable box blur of radius r (edge-clamped), via cumulative sums."""
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
        hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
        lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
        a = ((hi - lo) / (2 * r + 1)).astype(np.float32)
    return a


def blur(a, r):
    return box(box(box(a, r), r), r)  # three box passes ~ gaussian


height = blur(lum, 1) - blur(lum, 12)          # fine carving and mortar, not whole-stone shading
height = height * (1.0 - glass)                 # glass is flat
gy, gx = np.gradient(height)                    # image y points down
n = np.stack([-gx * STRENGTH * 4.0, -gy * STRENGTH * 4.0, np.ones_like(height)], axis=-1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)
Image.fromarray(np.clip((n * 0.5 + 0.5) * 255.0 + 0.5, 0, 255).astype(np.uint8), "RGB").save(out_normal)

detail = blur(lum, 1) - blur(lum, 6)
rough = 0.78 - detail * 1.5                     # crevices (darker than surroundings) rougher, raised faces smoother
rough = rough * (1.0 - glass) + 0.08 * glass    # glass is glossy
Image.fromarray(np.clip(rough * 255.0 + 0.5, 0, 255).astype(np.uint8), "L").save(out_rough)

print(f"normal: mean xy tilt {np.abs(n[..., :2]).mean():.3f}; roughness: mean {rough.mean():.2f}, "
      f"min {rough.min():.2f}, max {rough.max():.2f}; glass {glass.mean():.1%} of texels")
