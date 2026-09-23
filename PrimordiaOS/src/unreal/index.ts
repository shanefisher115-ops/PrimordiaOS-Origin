import { WebSocketServer } from 'ws';
import { synthesizeRealmEntity } from './latticeMind';
import fs from 'fs';
import path from 'path';

const wss = new WebSocketServer({ port: 8085 });

wss.on('connection', (ws) => {
    console.log('[LatticeServer] ⚡ Unreal Engine telemetry bridge linked.');

    ws.on('message', async (message: string) => {
        try {
            const packet = JSON.parse(message);
            
            if (packet.eventType === 'PLAYER_TELEMETRY') {
                const { x, y, z } = packet.data.location;
                
                // Quantize into 1000-unit grid sectors
                const sectorX = Math.floor(x / 1000);
                const sectorY = Math.floor(y / 1000);
                const sectorKey = `${sectorX},${sectorY}`;
                
                const tiers = ["PRIME_LATTICE", "OBSIDIAN_CORE", "AETHER_SPIRE", "QUANTUM_VOID"];
                const tier = tiers[Math.abs(sectorX + sectorY) % tiers.length];
                const seed = Math.floor(Math.abs(x * y) % 999991);

                console.log(`[LatticeServer] Quantized Sector [${sectorKey}] | Tier: ${tier}`);

                // Summon LLM Intelligence for this sector
                const entityLore = await synthesizeRealmEntity(sectorKey, tier, seed);

                const manifest = {
                    sectorKey,
                    coordinates: { x: sectorX * 1000, y: sectorY * 1000, z: 0 },
                    architectureTier: tier,
                    seed,
                    entityLore,
                    timestamp: Date.now()
                };

                // Persist manifest to disk
                const filePath = path.join(process.cwd(), 'data', 'realms', `sector_${sectorX}_${sectorY}.json`);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));

                // Broadcast fully conscious manifest back to Unreal daemon
                ws.send(JSON.stringify(manifest));
                console.log(`[LatticeServer] 🧠 Broadcasted conscious realm manifest for [${sectorKey}]`);
            }
        } catch (err) {
            console.error('[LatticeServer] Packet processing error:', err);
        }
    });
});

console.log('[LatticeServer] Autonomous Event Bus listening on ws://localhost:8085');