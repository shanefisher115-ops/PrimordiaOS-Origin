// primordiaos/unreal/bridge.ts
import fetch from "node-fetch";
export default class UnrealBridge {
    static endpoint = "http://localhost:8080/unreal"; // Unreal server endpoint
    // Send a command to Unreal Engine
    static async send(command, payload) {
        const response = await fetch(UnrealBridge.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, payload }),
        });
        if (!response.ok) {
            throw new Error(`UnrealBridge error: ${response.statusText}`);
        }
        return await response.json();
    }
    // Place a decal (your logo) into the Unreal scene
    static async placeDecal(payload) {
        return await UnrealBridge.send("placeDecal", payload);
    }
    // Adjust decal if verification fails
    static async adjustDecal(payload) {
        return await UnrealBridge.send("adjustDecal", payload);
    }
}
