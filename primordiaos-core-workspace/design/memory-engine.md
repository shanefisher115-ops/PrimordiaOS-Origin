# Memory Engine

## Purpose
Provide temporal + spatial memory scoped by realm.

## Responsibilities
- Store and retrieve data per realm.
- Support simple key/value initially.
- Later: embeddings, vector search, timelines.

## Interfaces
- API: set(realm, id, value), get(realm, id).
- Emits: memory.set, memory.get.
- Consumes: agent and scheduler requests.

## Constraints
- Must be safe for concurrent access.
- Keys are namespaced by realm.
