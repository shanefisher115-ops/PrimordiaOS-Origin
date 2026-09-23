// ======================================================
// TEXT → CINEMATIC INSTRUCTION PARSER
// Hybrid deterministic + creative parsing
// ======================================================

export interface CinematicInstruction {
    scene: string;
    camera: string;
    lighting: string;
    mood: string;
    actions: string[];
}

export class TextToUnrealParser {
    parse(text: string): CinematicInstruction {
        // Deterministic extraction
        const base = {
            scene: this.extractScene(text),
            camera: this.extractCamera(text),
            lighting: this.extractLighting(text),
            mood: this.extractMood(text),
            actions: this.extractActions(text)
        };

        return base;
    }

    private extractScene(text: string) {
        if (text.includes("forest")) return "forest";
        if (text.includes("city")) return "city";
        if (text.includes("ocean")) return "ocean";
        return "default_scene";
    }

    private extractCamera(text: string) {
        if (text.includes("close")) return "close_up";
        if (text.includes("wide")) return "wide_shot";
        return "cinematic_default";
    }

    private extractLighting(text: string) {
        if (text.includes("dark")) return "low_light";
        if (text.includes("bright")) return "high_key";
        return "neutral";
    }

    private extractMood(text: string) {
        if (text.includes("sad")) return "somber";
        if (text.includes("happy")) return "uplifting";
        return "neutral";
    }

    private extractActions(text: string) {
        const actions = [];
        if (text.includes("run")) actions.push("run");
        if (text.includes("jump")) actions.push("jump");
        if (text.includes("fly")) actions.push("fly");
        return actions.length ? actions : ["idle"];
    }
}
