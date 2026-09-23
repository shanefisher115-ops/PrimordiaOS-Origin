import fs from 'fs';

const PROMPT_LIBRARY_PATH = './cinematic_queue.json';

const aestheticParameters = {
    coreThemes: [
        "PrimordiaOS cosmic reactor core pulsing with golden holographic data streams",
        "Encapsulated quantum singularity surrounded by orbiting toroidal interface rings",
        "Dark synthwave server vault with glowing neon optical fiber conduits",
        "Parametric 3D geometric manifold rotating inside a hyper-dimensional grid"
    ],
    cameraMotions: [
        "Ultra-smooth slow orbital pan, macro lens, cinematic depth of field",
        "Fast dynamic fly-through zoom, volumetric lighting, ray-traced reflections",
        "Steady-cam close drift, anamorphic lens flare, particulate dust floating in light beams"
    ],
    lightingSpecs: [
        "Bioluminescent cyan and amber illumination, deep obsidian shadows, HDR contrast",
        "Hyper-saturated neon purple and electric blue rim lighting, chromatic aberration",
        "Monochromatic gold-on-black metallic sheen, soft ambient occlusion"
    ]
};

function generateOptimizedBatch(count = 5) {
    console.log(`[Primordia Flow] Synthesizing ${count} high-impact Ultra prompts...`);
    const batch = [];

    for (let i = 0; i < count; i++) {
        const theme = aestheticParameters.coreThemes[Math.floor(Math.random() * aestheticParameters.coreThemes.length)];
        const motion = aestheticParameters.cameraMotions[Math.floor(Math.random() * aestheticParameters.cameraMotions.length)];
        const lighting = aestheticParameters.lightingSpecs[Math.floor(Math.random() * aestheticParameters.lightingSpecs.length)];

        const engineeredPrompt = `${theme}, ${motion}, ${lighting}, 8k resolution, photorealistic cinematic render --ar 16:9 --ultra`;

        batch.push({
            id: `primordia_broll_${Date.now()}_${i}`,
            prompt: engineeredPrompt,
            status: 'QUEUED',
            targetEngine: 'Google Flow Ultra'
        });
    }

    fs.writeFileSync(PROMPT_LIBRARY_PATH, JSON.stringify(batch, null, 2));
    console.log(`[Primordia Flow] Batch saved successfully to ${PROMPT_LIBRARY_PATH}. Ready for pipeline execution.`);
}

generateOptimizedBatch(10);
