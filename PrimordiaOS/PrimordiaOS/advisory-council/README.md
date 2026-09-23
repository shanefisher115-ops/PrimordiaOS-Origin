# PrimordiaOS Advisory Council

The **Advisory Council** serves as the cognitive branch of PrimordiaOS. It provides non-binding, multi-perspective analysis to the Court, Guardian, and Kernel.

## Components

- **Council Engine (`council-engine.cjs`)**: The main orchestrator that periodically runs cognitive cycles.
- **Council Policy (`council-policy.json`)**: Configurable thresholds, quorum settings, and AI rules.
- **Watchdog (`watchdog.cjs`)**: Analyzes runtime behavior, loop abnormalities, and recursion depths.
- **Sentinel (`sentinel.cjs`)**: Validates module signatures and monitors for unauthorized system changes.
- **Historian (`historian.cjs`)**: Maintains system event memory and detects behavioral drift patterns.
- **Oracle (`oracle.cjs`)**: Provides non-binding AI-driven advisory based on system context.
- **Auditor (`auditor.cjs`)**: Checks proposed actions against policy, safety rules, and autonomy rules.
- **Mediator (`mediator.cjs`)**: The consensus engine that aggregates advisor outputs and forms a quorum-based decision.
- **Adapters (`council-adapters.cjs`)**: Bridges the Council's read-only insights to the Kernel, Guardian, Court, Bus, and Cockpit.
- **Log (`council-log.cjs`)**: An immutable trail of all Council analyses and recommendations.

## Constraints

The Advisory Council operates strictly as an observer and advisor:
- It **MUST NOT** override the Kernel.
- It **MUST NOT** override the Guardian.
- It **MUST NOT** override the Court.
- It **MUST NOT** execute arbitrary system actions.
