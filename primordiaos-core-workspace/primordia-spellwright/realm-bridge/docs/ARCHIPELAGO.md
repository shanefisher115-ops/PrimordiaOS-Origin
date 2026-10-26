# The archipelago: a procedural world of realms

The world is a **cloud sea of floating realms** around the live one. Every island is a complete PRS-1 realm built by Worldforge, with its own seed, biome, palette and native species. **Sky-bridges** you can walk join the islands. Unreal streams islands in as full realms when you come near and shows them as glowing silhouettes from afar.

```
world seed ──► archipelago.js ──► 12 islands (Poisson disc, ~2.6 km across, ±25 m altitude)
                  │                 each: biome → intent → Worldforge intentToManifest(seed) → full realm
                  │                 each: 2 native species (archetypes from the biome)
                  ├─► sky-bridges: minimum spanning tree + 3 short extra links
                  └─► world_manifest packet (one, ~23 KB) ──► AArchipelagoActor (Unreal)
                                                                ├ rock underside under every island
                                                                ├ far: disc + glowing spires in the island's hue
                                                                ├ near (< 650 m): a full ARealmRootActor (out again past 800 m)
                                                                └ sky-bridges: arched plank decks, posts, amber lamps (walkable)
island species ──► species:<island>-<name> at 1 Hz ──► ASpeciesActor (hidden and idle beyond 900 m)
```

The home island is the live realm at the origin: it keeps its own story (the Sovereign, evolution, voice) and streams as `realm_manifest`, as before. It also keeps the Sanctum.

## Biomes

| Biome | Layers | Metaphysics | Species archetypes |
|---|---|---|---|
| Verdant Spires | ground, spire field, sky | bright, ordered, calm | Photosynthetic, Collective |
| Ember Crown | ground, ring, sky | bright, stormy | Elemental, Predatory |
| Frost Lattice | ground, lattice, sky | very ordered, calm | Synthetic, Spectral |
| Dream Hollow | ground, spire field, ring | lucid | Spectral, Fungal |
| Abyssal Reach | ground, void, sky | shadowed, dim | Abyssal, Predatory |
| Crystal Choir | ground, spire field, lattice | resonant, ordered | Elemental, Collective |
| Fungal Deep | ground, ring, lattice | lucid, unsettled | Fungal, Photosynthetic |

Biomes are dealt from a seeded shuffle, so a world shows all seven before any repeats. Every island starts with `ground`, so all of them can be walked.

## Running it

It's on by default: `node src/server.js` builds the world from `--seed`. Use `--islands N` to change the count, or `--no-archipelago` for a single realm. In Unreal, open RealmBench and press Play. Walk the bridges (Shift to sprint) or fly (F). You spawn at the head of the bridge to Sorok Vigil: turn around from the realm to see it.

Two render cameras come from `Scripts/build_realm_sanctum.py`: `Sanctum_ArchipelagoCamera` (high, wide) and `Sanctum_BridgeCamera` (eye height on the home → Sorok Vigil bridge, for the default seed only). Use them with `live_shot.ps1 -Camera <name>`. Islands stream around the player pawn, not the shot camera.

## Performance on the integrated GPU

- **Only nearby islands are real realms.** Usually 1–2 neighbours plus home are loaded. Streaming changes at most one island per half second, so a load never stacks with another.
- **Distant islands cost three instanced meshes in total:** undersides, discs and spires, plus the bridge planks, posts and lamps. That's six instanced components for the whole world, about 2,300 planks.
- **Only the live realm drives the atmosphere.** Island realms skip their own fog, colour grade and the global metaphysics collection (`ARealmRootActor::bDrivesAtmosphere = false`), so twelve realms never fight over the sky.
- **Species on far islands** are hidden and not simulated (`ASpeciesActor::FarCullMeters`, 900 m).

## Protocol

`world_manifest` (id `world`): `world_id, name, seed, islands[{id, home, realm_id, name, biome, biome_label, position (m), radius (m), hue, manifest?}], bridges[{a, b}]`. The home island has no `manifest`. It is sent on connect and never times out in Unreal (`IsBusy`). Island species are ordinary `species` packets with an `island` field.

## Not done yet

- Island realms don't evolve and have no Sovereign of their own. Only home has a story.
- Bridges end at island rims, whatever terraces stand there, so you may step onto a terrace edge.
