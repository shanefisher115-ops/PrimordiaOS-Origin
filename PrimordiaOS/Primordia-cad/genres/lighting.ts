// Lighting presets for previews, as data. The WebGL previewer and the review gallery interpret them
// (PrimordiaOS/realm-asset-engineer/preview); a genre pack names one. Colours are sRGB 0..1, angles in
// degrees (azimuth from +X towards +Y in the kernel's Z-up frame, elevation above the horizon).

export interface DirectionalLight { color: [number, number, number]; intensity: number; azimuth: number; elevation: number }

export interface LightingPreset {
    doc: string;
    background: { top: [number, number, number]; horizon: [number, number, number]; bottom: [number, number, number] };
    hemisphere: { sky: [number, number, number]; ground: [number, number, number]; intensity: number };
    key: DirectionalLight;
    rim: DirectionalLight;
    environment: number; // strength of the neutral studio environment map (PBR reflections)
    exposure: number; // ACES tone-mapping exposure
    emissiveBoost: number; // multiplier on emissive slots (glowing glass)
}

export const LIGHTING: Record<string, LightingPreset> = {
    "gothic-dusk": {
        doc: "The cathedral's look: dark stone against a deep blue sky, warm orange horizon light, cyan rim from behind.",
        background: { top: [0.03, 0.05, 0.13], horizon: [0.78, 0.38, 0.14], bottom: [0.06, 0.05, 0.06] },
        hemisphere: { sky: [0.32, 0.38, 0.6], ground: [0.1, 0.08, 0.07], intensity: 0.5 },
        key: { color: [1.0, 0.62, 0.32], intensity: 2.6, azimuth: 235, elevation: 20 },
        rim: { color: [0.35, 0.85, 1.0], intensity: 2.4, azimuth: 60, elevation: 35 },
        environment: 0.25,
        exposure: 1.0,
        emissiveBoost: 1.6,
    },
    "ruins-overcast": {
        doc: "Soft overcast daylight with a pale sky, for weathered and broken masonry.",
        background: { top: [0.46, 0.52, 0.58], horizon: [0.78, 0.76, 0.7], bottom: [0.3, 0.29, 0.26] },
        hemisphere: { sky: [0.75, 0.8, 0.86], ground: [0.32, 0.3, 0.24], intensity: 1.4 },
        key: { color: [1.0, 0.95, 0.86], intensity: 1.6, azimuth: 225, elevation: 48 },
        rim: { color: [0.7, 0.78, 0.9], intensity: 0.6, azimuth: 45, elevation: 25 },
        environment: 0.6,
        exposure: 1.0,
        emissiveBoost: 0.6,
    },
    "scifi-night": {
        doc: "Night city: near-black sky over a magenta horizon, cool white key, cyan and magenta rims; glass glows.",
        background: { top: [0.01, 0.01, 0.04], horizon: [0.36, 0.07, 0.42], bottom: [0.02, 0.02, 0.04] },
        hemisphere: { sky: [0.2, 0.3, 0.55], ground: [0.06, 0.03, 0.08], intensity: 0.7 },
        key: { color: [0.82, 0.9, 1.0], intensity: 2.0, azimuth: 220, elevation: 32 },
        rim: { color: [0.25, 0.95, 1.0], intensity: 2.6, azimuth: 50, elevation: 20 },
        environment: 0.55,
        exposure: 1.1,
        emissiveBoost: 2.2,
    },
};
