# Unreal Bridge

## Purpose
Connect PrimordiaOS realms and agents to Unreal Engine visualization.

## Responsibilities
- IPC between PrimordiaOS and Unreal.
- Map realms to levels/scenes.
- Visualize swarm activity and worldgen output.

## Interfaces
- API: sendToUnreal(message), onFromUnreal(handler).
- Emits: unreal.update, unreal.error.
- Consumes: realm + worldgen events.

## Constraints
- Non-blocking IPC.
- Resilient to Unreal restarts.
