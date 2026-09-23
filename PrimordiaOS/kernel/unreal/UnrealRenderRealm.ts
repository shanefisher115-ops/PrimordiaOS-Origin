// ======================================================
// UNREAL RENDER REALM
// Deterministic + creative cinematic rendering
// ======================================================

import { TextToUnrealParser } from "./TextToUnrealParser";
import { CinematicPlanEngine } from "./CinematicPlanEngine";
import { UnrealBridge } from "./UnrealBridge";

export class UnrealRenderRealm {
    name = "unreal-render-realm";

    parser = new TextToUnrealParser();
    planner = new CinematicPlanEngine();
    bridge = new UnrealBridge();

    async execute(task: any, resources: any) {
        const instr = this.parser.parse(task.payload);
        const plan = this.planner.generatePlan(instr);

        const output = await this.bridge.render(plan);

        return {
            realm: this.name,
            agent: task.agent,
            output,
            stateUpdate: {
                realm: { lastRender: output.videoPath },
                agent: { lastVideo: output }
            },
            resources
        };
    }
}
