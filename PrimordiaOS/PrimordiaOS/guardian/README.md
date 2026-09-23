# PrimordiaOS Guardian Realm

The Guardian Realm is the safety branch of PrimordiaOS. It actively upholds the **Zero Drift Law** at all times.

## Architecture

- **Engine** (`guardian-engine.cjs`): The core monitoring loop.
- **Policy** (`guardian-policy.json`): The strict safety configuration rules.
- **Validators** (`guardian-validators.cjs`): Evaluates actions prior to execution to ensure they meet policy.
- **Override** (`guardian-override.cjs`): Logic to block unsafe actions and emit override events.
- **Quarantine** (`guardian-quarantine.cjs`): Registry to isolate unapproved targets.
- **Safe Mode** (`guardian-safe-mode.cjs`): Logic to force the kernel into SAFE MODE upon critical violations.
- **Integrity** (`guardian-integrity.cjs`): Continuous checks for unauthorized changes to core files and modules.
- **Logs** (`guardian-log.cjs`): Immutable, append-only logging to `logs.jsonl`.
- **Adapters** (`guardian-adapters.cjs`): Integration wrappers for Kernel, Court, Advisors, Message Bus, and Cockpit.

## Safety Model

1. **Validation**: All high-risk actions are passed to `guardian.validate(action)`.
2. **Override**: If validation fails, `guardian.override()` is triggered, halting execution.
3. **Quarantine**: Bad actors or compromised modules are isolated.
4. **Safe Mode**: Repeated severe offenses or integrity violations force the entire OS into SAFE MODE.

The Guardian Realm itself is immutable from the perspective of other realms.
