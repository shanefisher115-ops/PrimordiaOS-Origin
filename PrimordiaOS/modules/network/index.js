import { Kernel } from "../../kernel/core/kernel.js";
export class NetworkModule {
    constructor() {
        console.log("[PrimordiaOS] Network Module Loaded");
    }
    send(channel, payload) {
        Kernel.emit("network.send", { channel, payload });
    }
    receive(channel, payload) {
        Kernel.emit("network.receive", { channel, payload });
    }
}
export const Network = new NetworkModule();
Kernel.registerModule("network", Network);
