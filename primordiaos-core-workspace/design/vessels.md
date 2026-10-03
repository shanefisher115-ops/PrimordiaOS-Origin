# Vessel Orchestrator

## Purpose
Manage Docker/containers as vessels for realms and services.

## Responsibilities
- Start/stop containers.
- Map realms to vessels.
- Health checks.
- Scaling decisions.

## Interfaces
- API: startVessel(config), stopVessel(id), getStatus(id).
- Emits: vessel.started, vessel.stopped, vessel.unhealthy.

## Constraints
- Must not leak containers.
- Must tolerate failures gracefully.
