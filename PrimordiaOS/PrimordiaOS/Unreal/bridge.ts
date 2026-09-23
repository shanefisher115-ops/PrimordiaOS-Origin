// primordiaos/unreal/bridge.ts

import fetch from "node-fetch";

interface DecalPayload {
  texture: string;
  size: { w: number; h: number };
  scene: string;
}

interface SimulationResult {
  stable: boolean;
  position: { x: number; y: number; z: number };
  collisions: number;
  lighting: string;
}

export default class UnrealBridge {
  static endpoint = "http://localhost:8080/unreal"; // Unreal server endpoint

  // Send a command to Unreal Engine
  private static async send(command: string, payload: any): Promise<any> {
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
  static async placeDecal(payload: DecalPayload): Promise<SimulationResult> {
    return await UnrealBridge.send("placeDecal", payload);
  }

  // Adjust decal if verification fails
  static async adjustDecal(payload: Partial<DecalPayload>): Promise<SimulationResult> {
    return await UnrealBridge.send("adjustDecal", payload);
  }
}
