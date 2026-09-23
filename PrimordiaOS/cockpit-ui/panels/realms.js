// panels/realms.js - Spatial Realm Gates Orchestrator
import * as THREE from "three";
import { createRealmGate } from "../components/RealmGate.js";

export function createRealmsOrchestrator(options = {}) {
  const { wsClient = null, onRealmChanged = null } = options;

  const group = new THREE.Group();
  const gates = [];

  const realmConfigs = [
    { name: "Sovereignty", color: 0xa855f7, position: new THREE.Vector3(-4.0, 1.2, -1.8), rotY: 0.8 },
    { name: "Substrate",   color: 0x06b6d4, position: new THREE.Vector3(-2.8, 3.2, -3.2), rotY: 0.4 },
    { name: "Temporal",    color: 0x10b981, position: new THREE.Vector3( 0.0, 3.8, -3.8), rotY: 0.0 },
    { name: "Lexicon",     color: 0xf59e0b, position: new THREE.Vector3( 2.8, 3.2, -3.2), rotY: -0.4 },
    { name: "Cosmic Sandbox", color: 0xec4899, position: new THREE.Vector3( 4.0, 1.2, -1.8), rotY: -0.8 }
  ];

  let currentRealm = "Sovereignty";

  realmConfigs.forEach(cfg => {
    const gate = createRealmGate(cfg.name, cfg.position, {
      color: cfg.color,
      onTrigger: (realmName) => {
        currentRealm = realmName;
        console.log(`[Realm Gate] Transitioning to: ${realmName}`);

        // Notify Masterplane via WS
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(JSON.stringify({
            type: "realm_switch",
            realm: realmName,
            timestamp: Date.now()
          }));
        }

        // Notify HUD and terminal
        if (typeof onRealmChanged === "function") {
          onRealmChanged(realmName, cfg.color);
        }
      }
    });

    gate.rotation.y = cfg.rotY;
    gates.push(gate);
    group.add(gate);
  });

  group.update = function (delta, elapsed) {
    gates.forEach(g => g.update(delta, elapsed));
  };

  group.getGates = function () {
    return gates;
  };

  group.getCurrentRealm = function () {
    return currentRealm;
  };

  return group;
}
