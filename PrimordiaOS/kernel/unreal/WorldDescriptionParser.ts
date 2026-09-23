// ======================================================
// TEXT → WORLD DESCRIPTION PARSER
// Deterministic core + creative extensions
// ======================================================

export interface WorldDescription {
    biome: string;
    terrain: string;
    weather: string;
    objects: string[];
    mood: string;
}

export class WorldDescriptionParser {
    parse(text: string): WorldDescription {
        return {
            biome: this.extractBiome(text),
            terrain: this.extractTerrain(text),
            weather: this.extractWeather(text),
            objects: this.extractObjects(text),
            mood: this.extractMood(text)
        };
    }

    private extractBiome(text: string) {
        if (text.includes("forest")) return "forest";
        if (text.includes("desert")) return "desert";
        if (text.includes("mountain")) return "mountain";
        if (text.includes("city")) return "city";
        return "default_biome";
    }

    private extractTerrain(text: string) {
        if (text.includes("flat")) return "flat";
        if (text.includes("rocky")) return "rocky";
        if (text.includes("hills")) return "hills";
        return "mixed";
    }

    private extractWeather(text: string) {
        if (text.includes("rain")) return "rain";
        if (text.includes("snow")) return "snow";
        if (text.includes("fog")) return "fog";
        return "clear";
    }

    private extractObjects(text: string) {
        const objs = [];
        if (text.includes("tree")) objs.push("tree");
        if (text.includes("house")) objs.push("house");
        if (text.includes("river")) objs.push("river");
        if (text.includes("rocks")) objs.push("rocks");
        return objs.length ? objs : ["ground"];
    }

    private extractMood(text: string) {
        if (text.includes("dark")) return "dark";
        if (text.includes("bright")) return "bright";
        if (text.includes("mysterious")) return "mysterious";
        return "neutral";
    }
}
