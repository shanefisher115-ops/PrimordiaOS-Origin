"""Tells whether a tangent-space normal map is DirectX (Unreal) or OpenGL (Blender's default).

    python normal_convention.py <normal.png> [...]     (needs numpy + pillow)

A normal map baked from a surface is the gradient of a height field, so it has no curl when its green
channel is read the right way up; read upside down, the curl jumps. The script measures the mean curl
both ways and reports the convention with the lower one, plus the ratio (how sure it is). Generated maps
score ~50x; maps baked from geometry are noisier (UV seams, mesh normals) and land nearer 1.2x, which is
still a usable signal — the Gothic church's real map came out OpenGL at 1.20x, matching Blender's default.
For OpenGL maps, import with PRIM_FLIP_GREEN=1 (import_asset.py).
"""
import sys

import numpy as np
from PIL import Image


def curl_both_ways(path):
    n = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 127.5 - 1.0
    nz = np.clip(n[..., 2], 0.2, None)
    sx, sy = -n[..., 0] / nz, -n[..., 1] / nz   # slopes, with green read as DirectX (image y down)
    dsx_drow = np.gradient(sx, axis=0)
    dsy_dcol = np.gradient(sy, axis=1)
    return np.abs(dsx_drow - dsy_dcol).mean(), np.abs(dsx_drow + dsy_dcol).mean()


for path in sys.argv[1:]:
    as_dx, as_gl = curl_both_ways(path)
    verdict = "DirectX (import as is)" if as_dx < as_gl else "OpenGL (import with PRIM_FLIP_GREEN=1)"
    print(f"{path}: {verdict}; curl {as_dx:.4f} as DirectX vs {as_gl:.4f} as OpenGL, "
          f"{max(as_dx, as_gl) / max(min(as_dx, as_gl), 1e-9):.2f}x")
