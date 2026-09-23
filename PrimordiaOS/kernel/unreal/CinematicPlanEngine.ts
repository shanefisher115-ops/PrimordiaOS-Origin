// ======================================================
// CINEMATIC PLAN ENGINE
// Deterministic core + creative extensions
// ======================================================

import { CinematicInstruction } from "./TextToUnrealParser";

export interface CinematicPlan {
    seed: number;
    deterministicPlan: any;
    creativePlan: any;
}

export class CinematicPlanEngine {
    generatePlan(instr: CinematicInstruction): CinematicPlan {
        const seed = this.generateSeed(instr);

        const deterministicPlan = {
            scene: instr.scene,
            camera: instr.camera,
            lighting: instr.lighting,
            mood: instr.mood,
            actions: instr.actions
        };

        const creativePlan = {
            cameraMotion: this.randomMotion(seed),
            lightingVariation: this.randomLighting(seed),
            moodIntensity: this.randomIntensity(seed)
        };

        return { seed, deterministicPlan, creativePlan };
    }

    private generateSeed(instr: CinematicInstruction): number {
        return (
            instr.scene.length +
            instr.camera.length +
            instr.lighting.length +
            instr.mood.length +
            instr.actions.join("").length
        ) % 9973;
    }

    private randomMotion(seed: number) {
        const motions = ["pan_left", "pan_right", "tilt_up", "tilt_down", "dolly_in"];
        return motions[seed % motions.length];
    }

    private randomLighting(seed: number) {
        const variations = ["warm", "cool", "contrast", "soft"];
        return variations[(seed * 3) % variations.length];
    }

    private randomIntensity(seed: number) {
        return (seed % 10) / 10;
    }
}
