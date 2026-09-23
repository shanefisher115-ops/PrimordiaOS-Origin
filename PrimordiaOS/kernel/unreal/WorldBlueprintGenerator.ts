// ======================================================
// WORLD BLUEPRINT GENERATOR
// Deterministic + creative world planning
// ======================================================

import { WorldDescription } from "./WorldDescriptionParser";

export interface WorldBlueprint {
    seed: number;
    deterministic: any;
    creative: any;
}

export class WorldBlueprintGenerator {
    generate(desc: WorldDescription): WorldBlueprint {
        const seed = this.generateSeed(desc);

        const deterministic = {
            biome: desc.biome,
            terrain: desc.terrain,
            weather: desc.weather,
            objects: desc.objects
        };

        const creative = {
            objectScatter: this.randomScatter(seed),
            lightingVariation: this.randomLighting(seed),
            biomeBlend: this.randomBlend(seed)
        };

        return { seed, deterministic, creative };
    }

    private generateSeed(desc: WorldDescription): number {
        return (
            desc.biome.length +
            desc.terrain.length +
            desc.weather.length +
            desc.objects.join("").length +
            desc.mood.length
        ) % 9973;
    }

    private randomScatter(seed: number) {
        return (seed % 10) + 5; // number of objects to scatter
    }

    private randomLighting(seed: number) {
        const variations = ["warm", "cool", "neutral", "contrast"];
        return variations[(seed * 3) % variations.length];
    }

    private randomBlend(seed: number) {
        const blends = ["none", "soft", "medium", "strong"];
        return blends[(seed * 7) % blends.length];
    }
}
