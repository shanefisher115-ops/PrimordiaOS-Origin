# Primordia-cad

PrimordiaOS's parametric CAD kernel. It turns plain numeric parameters into closed triangle meshes of
Gothic architecture and exports them as glTF 2.0 (`.glb`) and OBJ for Unreal and other tools.
Agents tune parts with the existing CAD cycle: `applyMutation` edits a parameter, `regenerateGeometry`
rebuilds the mesh.

Solids are built with [manifold-3d](https://github.com/elalish/manifold) (WASM, Apache-2.0), so every
boolean result is a closed, oriented 2-manifold.

## Setup

Node 22.18 or newer (it runs the TypeScript sources directly, no build step):

```bash
npm install
npm test
```

## CLI

```bash
node gothic.mjs spire --height 40 --sides 8 --out spire.glb
node gothic.mjs lamp --arms 2 --out lamp.obj --preview lamp.png
node gothic.mjs kit --out kit
node gothic.mjs list
node gothic.mjs spire --help
```

- `--<param> <value>`: any generator parameter (kebab or camel case: `--base-width` = `--baseWidth`).
- `--out`: `.glb` or `.obj` (an `.mtl` is written next to an `.obj`). Default `<generator>.glb`.
- `--preview <png>`: a quick software-rendered picture of the piece (`--view-yaw`, `--view-pitch` in degrees).
- `kit`: writes every piece of the default kit (or `--preset kit.json`: `[{ "name", "kind", "params" }]`)
  in `--formats glb,obj`, plus `manifest.json` (params, bounds, triangle counts, sockets) and `preview.png`.

## Generators

| kind | what | main params (defaults) |
|---|---|---|
| `spire` | polygonal spire: collar, string courses, crockets on every arris, gabled lucarnes, finial | height 40, baseWidth 12, sides 8, crockets 9, crocketSize 0.9, bands 2, lucarnes 1, finialHeight 3 |
| `pinnacle` | square shaft with blind lancets, crossing gablets, crocketed spirelet, finial | height 5, width 0.9, crockets 4, gablets 1, panels 1 |
| `lancet` | pointed-arch window: frame, hood mould, sill, mullions, foiled oculus in the head, glass | width 2.4, height 7, pointedness 1, lights 2, frameWidth 0.3, depth 0.5, foils 4, glass 1 |
| `rose` | rose window disc: moulded rim, radial lights, trefoil oculi, foiled hub, glass | diameter 8, depth 0.5, petals 12, rimWidth 0.5, hub 0.2, foils 6, glass 1 |
| `gable` | gabled wall: rose window in the triangle over a band of lancets, crocketed coping, finial | width 15, pitch 60, wallHeight 5, depth 1.5, lancets 5, rose 1, crockets 1, glass 1 |
| `buttress` | flying buttress: stepped pier, half-arch flyer to the wall along +X, coping crockets, pier pinnacle | span 6, height 14, pierWidth 1.2, pierDepth 2.2, thickness 0.8, pinnacle 1, crockets 1 |
| `balustrade` | segment along X: plinth, moulded rail, turned balusters or quatrefoil panels, end posts | length 3, height 1, depth 0.3, spacing 0.3, style 0, posts 1 |
| `lamp` | cast-iron street lamp: turned post, one lantern or 1-4 swan-neck arms | height 4.2, arms 0, lanternSize 0.6, glass 1 |

`node gothic.mjs list` prints every parameter with its range. Values outside a range are clamped (with a
warning); integer parameters are rounded; 0/1 parameters are switches.

## Conventions

- Metres. Z up in the kernel; glTF and OBJ files are written Y up (`(x, y, z)` becomes `(x, z, -y)`), as
  those formats expect.
- Pivot at the base centre (z = 0 is the ground). Windows and balustrades face -Y and run along X. The
  buttress pivots at its pier; the wall plane is `x = pierDepth/2 + span`.
- Each generator states the box its mesh stays inside (`statedBounds`), and the tests hold it to that.
- Material slots by name: `Stone`, `Glass` (window and lantern glazing), `Iron` (lamps).
- UVs are world-scale box projections: 1 UV unit = 1 m, so tiling textures repeat at real size.
  Normals are split at edges sharper than 40 degrees (octagon faces stay crisp, turned parts are smooth).

## From code

```ts
import { generate, toGLB, toOBJ } from "./kernel/index.ts";
import { previewPNG } from "./kernel/preview.ts";

const g = generate("spire", { height: 50, sides: 8 });
g.stats;    // { closed, genus, volume (m^3), surfaceArea (m^2), triangleCount, ... }
g.sockets;  // named attachment points, e.g. a lamp's lantern centres
writeFileSync("spire.glb", toGLB(g));
```

The CAD cycle (`Primordia-core/services/cad-cycles.ts`) keeps its contract:

```ts
const updated = applyMutation({ kind: "spire", height: 30 }, { param: "height", type: "increase", delta: 10 });
const geo = regenerateGeometry(updated); // vertices, faces, metadata { volume, bounds, warnings, ... }
```

`kind` picks the generator (default `spire`). A parameter `applyMutation` turned into
`{ mode: "reshape", delta }` is read as the generator default + delta. The legacy metadata fields
(`wallThicknessApplied`, `material`, `topologyMode`, `reshape`) are still filled in.

## Into Unreal

Import the `.glb` files with the realm look-dev skill's `scripts/import_asset.py` (kind `mesh`). glTF goes
through Interchange, which reads metres and Y up, so pieces arrive at real size, Z up, Nanite on, with
slots named `Stone`/`Glass`/`Iron`. Use the `.glb`, not the `.obj`: Unreal's OBJ importer assumes Z up.
The cathedral scene (`realm-bridge/.../Scripts/build_cathedral_scene.py`) uses the kit from
`/Game/ThirdParty/PrimordiaGothicKit/` when it is there.
