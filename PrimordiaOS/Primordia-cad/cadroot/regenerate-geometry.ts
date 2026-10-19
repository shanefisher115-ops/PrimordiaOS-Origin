import { DEFAULT_KIND, generate } from "../kernel/index.ts";

/**
 * Rebuilds the part described by `updatedParams` as a closed triangle mesh (metres, Z up).
 *
 * `kind` picks the generator: spire, pinnacle, lancet, rose, buttress, balustrade or lamp (default spire).
 * Every other numeric field is a generator parameter. Missing values take the generator's defaults,
 * out-of-range values are clamped, and a field applyMutation turned into { mode: "reshape", delta }
 * is read as default + delta. `node gothic.mjs list` prints every parameter with its range.
 *
 * Returns the welded solid as `vertices` ([x, y, z]) and `faces` ([a, b, c], counter-clockwise seen from
 * outside); `geometry` is the full kernel result (render mesh with normals, UVs and material groups) that
 * toGLB/toOBJ export; `metadata` carries volume, surface area and bounds for simulation.
 */
export function regenerateGeometry(updatedParams: any) {
    console.log("[PrimordiaCAD] Regenerating geometry with params:", updatedParams);

    const kind = updatedParams.kind ?? updatedParams.generator ?? DEFAULT_KIND;
    const g = generate(kind, updatedParams);

    const vertices: number[][] = [];
    for (let i = 0; i < g.solid.positions.length; i += 3) {
        vertices.push([g.solid.positions[i], g.solid.positions[i + 1], g.solid.positions[i + 2]]);
    }
    const faces: number[][] = [];
    for (let i = 0; i < g.solid.triangles.length; i += 3) {
        faces.push([g.solid.triangles[i], g.solid.triangles[i + 1], g.solid.triangles[i + 2]]);
    }

    const geometry = {
        kind,
        vertices,
        faces,
        geometry: g,
        metadata: {
            regeneratedAt: Date.now(),
            paramsUsed: updatedParams,
            resolvedParams: g.params,
            warnings: g.warnings,
            triangleCount: g.stats.triangleCount,
            closed: g.stats.closed,
            genus: g.stats.genus,
            volume: g.stats.volume, // m^3, so mass = volume * density
            surfaceArea: g.stats.surfaceArea, // m^2
            bounds: g.bounds,
            materials: g.render.groups.map((group) => group.material),
            sockets: g.sockets,
        } as Record<string, unknown>,
    };

    // Basic example: thickness affects scale
    if (typeof updatedParams.wallThickness === "number") {
        geometry.metadata.wallThicknessApplied = updatedParams.wallThickness;
    }

    // Material changes
    if (updatedParams.material) {
        geometry.metadata.material = updatedParams.material;
    }

    // Topology changes
    if (updatedParams.topologyMode) {
        geometry.metadata.topologyMode = updatedParams.topologyMode;
    }

    // Reshape instructions
    if (typeof updatedParams.wallThickness === "object" && updatedParams.wallThickness.mode === "reshape") {
        geometry.metadata.reshape = updatedParams.wallThickness;
    }

    console.log(`[PrimordiaCAD] Geometry regenerated: ${kind}, ${g.stats.triangleCount} triangles, closed=${g.stats.closed}.`);
    return geometry;
}
