# Worldgen

## Purpose
Generate procedural realms, biomes, and content.

## Responsibilities
- Define biome rules.
- Handle seeds.
- Produce realm configurations.
- Integrate with Realm Engine and Unreal Bridge.

## Interfaces
- API: generate(seed), getBiome(id).
- Emits: worldgen.realm.created, worldgen.biome.generated.

## Constraints
- Deterministic for same seed.
- Extensible for new biome types.
