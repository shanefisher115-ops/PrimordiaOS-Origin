# PHOM Router

## Purpose
Route messages between realms, subsystems, and agents.

## Responsibilities
- Topic-based publish/subscribe.
- Cross-realm dispatch.
- Subsystem addressing.

## Interfaces
- API: subscribe(topic, handler), publish(msg).
- Message: { from, to, topic, payload }.
- Emits: phom.delivered, phom.dropped.

## Constraints
- Handlers must be async-safe.
- No hard dependencies on specific subsystems.
