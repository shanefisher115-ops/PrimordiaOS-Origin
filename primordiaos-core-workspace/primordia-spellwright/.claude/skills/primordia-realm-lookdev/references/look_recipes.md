# Look recipes that worked

Values from the night cathedral (`build_cathedral_scene.py`). They're relative to its exposure, so change exposure and emissive together.

## Exposure and emissive

- Post process: manual exposure, physical camera exposure **off**, `auto_exposure_bias` +1 (it's plain compensation: +1 doubles brightness). Negative values blacked the scene out.
- With that exposure, glass emissive ≈ 0.35–0.5 and ring intensity ≈ 4–5 read as bright and saturated. Look guides that say "emissive 50" assume physical exposure (multiply by roughly 40).
- Bloom: standard method, intensity ~2.6, size scale ~6. FFT/convolution bloom costs a lot and needs a kernel; keep it for cinematics.

## Night atmosphere

- Sky atmosphere + volumetric clouds + dim moon (directional 0.6 lux, atmosphere sun) + sky light (real-time capture, indigo tint, lower hemisphere black) gives a stormy blue sky.
- Exponential height fog: density 0.006, falloff 0.05, volumetric fog **on**, albedo bright (~0.85) — a dark albedo kills god rays; darken with density/extinction instead. Volumetric fog distance 400 m.
- God rays: narrow spots (inner 2°, outer 7°) with volumetric scattering ~6 under each glowing feature.
- Warm city glow: big point lights (≈7e4 cd, radius 260 m, scattering 4) **35 m up** at 170–240 m distance, so they land in a camera that looks up. At 10 m they sat below the frame.
- Ground glow: warm points (~900 cd, radius 30 m) along the base of the facade.

## Rings (shader planes)

Additive unlit two-sided material on a flat plane: concentric rings with gaussian cores, a faint gaussian halo per line (`Halo` ~0.09, `HaloWidth` ~0.045), streaks flowing around each ring with integer angular frequencies (seamless at the atan2 wrap), a small radius wobble, and a white-hot core. Two stacked planes per cluster for depth; rotate planes so their front faces the viewers. Bigger rings need tighter spacing (0.12) and more strands (5–6) to avoid looking like discs. Niagara ribbons would be the next step; Python can't author emitter stacks, so that part is manual (recipe in §9 of the materials guide).

## Windows

- **Separate window planes** (procedural lancet/rose with leading): additive, so outside the glass adds nothing.
- **Every window on a textured building:** in the stone material, emissive where albedo luminance < ~0.22 **and** |normal.z| < ~0.35 (keeps dark roofs off), cut into world-space leaded diamonds (~1.2 m) with per-pane brightness, one colour per 12 m column (cyan, ~30% magenta), slight flicker. Dark decorative trim near the base also lights up; accept it or mask by height.

## Surface realism

- Stone: albedo × dark tint, wet patches from low-frequency world noise (darker + glossier). A downloaded albedo needs the tint raised (0.07 vs 0.035) to keep the same value.
- Normal + roughness maps matter more than anything else for "real" stone. If they're missing, `derive_surface_maps.py` (brightness → height, high-passed; glass flat and glossy) adds visible relief and wet highlights.

## Photoreal plan (in order of payoff on this laptop)

1. Real surface maps (download the model's own normal/roughness when Epic is reachable).
2. CC0 scanned materials (Poly Haven / ambientCG): wet cobblestone plaza with puddles reflecting windows and rings.
3. Physical lighting: physical camera exposure, real light units, shadows on key lights, higher volumetric fog resolution.
4. Lens: ~24 mm, subtle depth of field, grain, restrained fringe.
5. Scale cues: lamps, railings, figures.
6. Final frames through Movie Render Queue (enabled in PrimordiaRealms) with many temporal samples — the way to beat the weak GPU.

The neon rings and coloured glass are intentionally unreal; "photoreal" means grounding them (wet reflections, fog interaction, real stone), not removing them.
