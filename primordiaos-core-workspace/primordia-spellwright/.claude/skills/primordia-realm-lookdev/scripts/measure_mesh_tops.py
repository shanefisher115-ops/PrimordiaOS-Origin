"""Commandlet script: finds the tallest features of a static mesh (towers, spires, chimneys) in model space.

Environment: PRIM_MESH (asset path), PRIM_TOP_BAND_CM (how far below the top to look, default 600),
PRIM_MIN_VERTS (density threshold per 1 m cell, default 300).

Collects vertices in the top band, bins them on a 1 m grid, joins neighbouring dense cells into clusters,
and logs each cluster's x/y footprint and top height in cm. Thin pinnacles fall below the density
threshold, so the clusters are the solid masses you'd attach things to. Output lines start with "TOPS".
"""
import collections
import os

import unreal

mesh = unreal.load_asset(os.environ["PRIM_MESH"])
band = float(os.environ.get("PRIM_TOP_BAND_CM", "600"))
min_verts = int(os.environ.get("PRIM_MIN_VERTS", "300"))

desc = mesh.get_static_mesh_description(0)
top = mesh.get_bounding_box().max.z
cells = collections.defaultdict(list)
for i in range(desc.get_vertex_count()):
    p = desc.get_vertex_position(unreal.VertexID(i))
    if p.z > top - band:
        cells[(int(p.x // 100), int(p.y // 100))].append((p.x, p.y, p.z))

dense = {c for c, pts in cells.items() if len(pts) >= min_verts}
seen, clusters = set(), []
for start in dense:
    if start in seen:
        continue
    stack, group = [start], []
    seen.add(start)
    while stack:
        cx, cy = stack.pop()
        group.append((cx, cy))
        for nx in (cx - 1, cx, cx + 1):
            for ny in (cy - 1, cy, cy + 1):
                if (nx, ny) in dense and (nx, ny) not in seen:
                    seen.add((nx, ny))
                    stack.append((nx, ny))
    clusters.append(group)

unreal.log(f"TOPS mesh top z={top:.0f}cm, {len(clusters)} solid masses in the top {band:.0f}cm")
for group in sorted(clusters, key=len, reverse=True):
    pts = [p for c in group for p in cells[c]]
    xs, ys, zs = zip(*pts)
    unreal.log(f"TOPS x=[{min(xs):.0f},{max(xs):.0f}] y=[{min(ys):.0f},{max(ys):.0f}] top={max(zs):.0f} "
               f"cells={len(group)} verts={len(pts)}")
