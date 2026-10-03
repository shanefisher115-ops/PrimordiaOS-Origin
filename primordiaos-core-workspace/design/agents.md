# Agent Swarm

## Purpose
Coordinate autonomous agents that perform tasks inside PrimordiaOS.

## Responsibilities
- Register agents with roles.
- Dispatch tasks to matching agents.
- Aggregate results.
- Integrate with memory, PHOM, scheduler.

## Interfaces
- API: register(agent), dispatch(task, ctx).
- Agent: { id, role, run(task, ctx) }.
- Emits: agent.executed, agent.error.

## Constraints
- Agents must be stateless or explicitly manage state.
- Swarm must not block on single agent failures.
