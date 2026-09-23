// ======================================================
// UNREAL WORLD RPC CLIENT
// Sends world creation commands → Unreal RPC servers
// ======================================================

import { UnrealRPCClient } from "./UnrealRPCClient";

export class UnrealWorldRPC {
    rpc = new UnrealRPCClient();

    async createTerrain(type: string) {
        return this.rpc.sendCpp({
            cmd: "update_world",
            terrain: type
        });
    }

    async spawnObject(name: string, location: number[]) {
        return this.rpc.sendPython({
            cmd: "spawn_actor",
            class: `/Game/Blueprints/${name}.${name}_C`,
            location
        });
    }

    async setWeather(type: string) {
        return this.rpc.sendCpp({
            cmd: "simulate_weather",
            weather: type
        });
    }
}
