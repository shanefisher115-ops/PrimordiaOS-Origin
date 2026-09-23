# ⚖️ PrimordiaOS Court Realm

The **Court Realm** is the judicial branch of PrimordiaOS. It is an independent, immutable, non-overridable subsystem that enforces the **Zero Drift Law**, evaluates all system actions through judicial hearings, issues binding verdicts, and enforces consequences.

## Architecture

```
court/
├── court-engine.cjs        → Main judicial engine (tick loop, case queue, hearing/verdict/enforcement pipeline)
├── court-policy.json       → Immutable legal framework (allowed verdicts, hearing requirements, enforcement priority)
├── court-case.cjs          → Case file generator (CR-<ISO_TIMESTAMP>-<UUIDv4> format)
├── court-proceedings.cjs   → Hearing logic (Prosecutor, Defense, Witnesses, Expert, Judges)
├── court-verdicts.cjs      → Verdict issuance (6 verdict types, policy + Zero Drift + Guardian validation)
├── court-enforcement.cjs   → Consequence engine (Kernel safe APIs + Guardian override APIs)
├── court-integrity.cjs     → Zero Drift Law monitor (continuous drift detection across 6 dimensions)
├── court-adapters.cjs      → Integration adapters (Kernel, Guardian, Advisors, Message Bus, Cockpit)
├── court-log.cjs           → Immutable append-only JSONL logger with SHA-256 integrity hashes
├── logs.jsonl              → Append-only judicial log (auto-created)
└── README.md               → This file
```

## Judicial Process

Every system action flows through this pipeline:

```
Event → Adapter → Case → Hearing → Verdict → Enforcement → Log
```

### Hearing Roles
| Role | Entity | Purpose |
|------|--------|---------|
| **Prosecutor** | Guardian | Presents safety assessment |
| **Defense** | Kernel | Explains the action |
| **Witnesses** | Watchdog, Sentinel, Historian | Provide independent reports |
| **Expert** | Oracle (AI) | Advisory opinion only |
| **Judges** | Court Engine + Policy | Final deliberation and verdict |

### Hearing Phases
1. **Opening** — Verify hearing requirement per policy
2. **Prosecution** — Guardian validates the action
3. **Defense** — Kernel provides context
4. **Witness Testimony** — Advisors submit reports
5. **Expert Opinion** — Oracle (AI) provides advisory input
6. **Deliberation** — Judges apply policy + Zero Drift Law

## Verdict Types

| Verdict | Effect |
|---------|--------|
| `allow` | Execute action via `kernel.executeSafe()` |
| `allow_with_conditions` | Execute with monitoring, time limits, and rollback-on-failure |
| `deny` | Block action — no execution |
| `deny_quarantine` | Block + quarantine source via `guardian.quarantine()` |
| `deny_safe_mode` | Block + force safe mode via `guardian.forceSafeMode()` |
| `deny_rollback` | Block + rollback to last stable via `kernel.rollbackToLastStable()` |

## Zero Drift Law

The Zero Drift Law is the supreme constitutional law of PrimordiaOS:

> **No component may deviate from its verified state without judicial review.**

The Court Integrity Monitor (`court-integrity.cjs`) continuously checks for:
- Unauthorized autonomy escalation
- Unauthorized module loads
- Unauthorized file writes
- Abnormal loop depth
- Abnormal error rate
- Realm instability
- Unsafe AI suggestion execution

On drift detection:
1. Emergency case generated
2. SAFE MODE forced immediately
3. Source quarantined
4. Action blocked
5. Immutable record logged

## Integration Points

### Kernel Safe APIs
```js
kernel.executeSafe(action: object): Promise<{ ok: boolean }>
kernel.adjustRealm(realmName: string, adjustments: object): Promise<{ ok: boolean }>
kernel.enterSafeMode(reason: string): void
kernel.rollbackToLastStable(): Promise<void>
```

### Guardian APIs
```js
guardian.override(action: object, reason: string): { overridden: boolean }
guardian.quarantine(target: string, reason: string): { quarantined: boolean }
guardian.forceSafeMode(reason: string): void
guardian.validate(action: object): { safe: boolean }
```

### Message Bus Events
```js
COURT_EVENT_TYPES = {
  CASE: 'COURT_CASE',
  HEARING: 'COURT_HEARING',
  VERDICT: 'COURT_VERDICT',
  ENFORCEMENT: 'COURT_ENFORCEMENT',
  DRIFT_ALERT: 'COURT_DRIFT_ALERT',
}
```

### Cockpit UI Panel
`cockpit-ui/src/panels/court-panel.jsx` displays:
- Active cases (violet accents)
- Hearings in progress
- Verdicts (auric gold)
- Enforcement actions (gold + red warnings)
- Drift alerts (emerald pulse + red flag)
- Immutable log viewer (silver grid)

## Security Model

### Enforcement Priority
| Authority | Level |
|-----------|-------|
| Guardian | Highest |
| Court | Final Authority |
| Kernel | Subordinate |
| Advisors | Advisory Only |
| AI | Advisory Only |

### Immutability Guarantees
- All Court source files are **read-only** (`0o555`)
- `logs.jsonl` is **append-only** with SHA-256 integrity hashes per record
- No external component can modify Court files
- Policy changes require Guardian signature validation
- Every log record includes a monotonic sequence number and cryptographic hash

### Constraints
The Court Engine MUST NOT:
- Modify Kernel code
- Modify Guardian code
- Modify Message Bus code
- Modify the Autonomy Layer
- Modify Advisors or AI
- Write outside `court/`

## Running the Court

```js
const { startCourt } = require('./court/court-engine.cjs');

// Assume bus, kernel, guardian, advisors are already instantiated
const court = startCourt(bus, kernel, guardian, advisors, {
  tickIntervalMs: 100,
});

// The Court automatically:
//   - Attaches all adapters to the bus
//   - Starts the tick loop
//   - Monitors for drift
//   - Processes cases through the judicial pipeline
//   - Logs all activity immutably
```

## Policy Configuration

See `court-policy.json` for the full legal framework:
- `zero_drift: true`
- `allow_autonomy_escalation: false`
- `allow_self_modification: false`
- `allow_ai_actions: false`
- `allow_external_commands: true`
- All action types require hearings
- Guardian has highest enforcement priority
- Court has final authority

---

**The Court Realm guarantees: zero drift, zero harm, zero destructive behavior.**
