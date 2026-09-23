// ======================================================
// UNREAL WORLD REALM
// Deterministic + creative world building
// ======================================================

import { WorldDescriptionParser } from "./WorldDescriptionParser";
import { WorldBlueprintGenerator } from "./WorldBlueprintGenerator";
import { UnrealWorldRPC } from "./UnrealWorldRPC";

export class UnrealWorldRealm {
    name = "unreal-world-realm";

    parser = new WorldDescriptionParser();
    planner = new WorldBlueprintGenerator();
    rpc = new UnrealWorldRPC();

    async execute(task: any, resources: any) {
        const desc = this.parser.parse(task.payload);
        const blueprint = this.planner.generate(desc);

        await this.rpc.createTerrain(blueprint.deterministic.terrain);

        for (let obj of blueprint.deterministic.objects) {
            await this.rpc.spawnObject(obj, [0, 0, 100]);
        }

        await this.rpc.setWeather(blueprint.deterministic.weather);

        return {
            realm: this.name,
            agent: task.agent,
            output: blueprint,
            stateUpdate: {
                realm: { lastWorld: blueprint },
                agent: { lastWorldBuild: blueprint }
            },
            resources
        };
    }
}
