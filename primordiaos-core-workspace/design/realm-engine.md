# Realm Engine

## Purpose
Manage realms as isolated execution spaces with lifecycle control and capabilities.

## Responsibilities
- Create, activate, deactivate realms.
- Track realm metadata and status.
- Expose realm list and lookup.
- Integrate with scheduler, agents, memory, and PHOM.

## Interfaces
- API: create(id, name), activate(id), deactivate(id), list().
- Emits: realm.created, realm.activated, realm.deactivated.
- Consumes: scheduler events, agent requests.

## Constraints
- Realm IDs must be unique.
- Activation/deactivation must be idempotent.
