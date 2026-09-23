# Primordial OS Agent Rules

Welcome to the Primordial OS agentic substrate. All agents operating on this codebase must follow these project-scoped rules.

## Core Rules

1. **Produce Artifacts**: Every code modification, design, or run must be accompanied by relevant artifacts (plans, logs, reports, walkthroughs) to prevent uninspected changes.
2. **Sovereignty First**: Do not construct patterns or loops that automate away all human decision-making or remove friction. Maintain the "anti-collapse" principles of high-friction, sovereign cognition.
3. **No Merges without Validation**: All proposed changes must be evaluated via the `ANTIGRAV()` checker and score at least `70` before staging or merging.
4. **Real Implementable Deliverables over Thematic Abstractions**: When implementing operational systems, tools, and pipelines, strictly distinguish between lore/aesthetic metaphors and executable system contracts. Deliver real, testable, production-grade implementations (e.g., valid RFC 5322, live DNS MX lookups, verifiable SQLite foreign keys, real background schedulers) without fictional mock stubs or placeholder escapism unless explicitly requested as visual UI theme elements.
5. **Desktop Sovereign Architecture (Electron + Headless Node Daemon)**: When packaging PrimordiaOS tools into desktop executables, always decouple the runtime into two independent tiers: (1) a headless local Node daemon running SQLite WAL, background agent swarms, cron tasks, and Express/WebSocket listeners on ports 3001/5055, and (2) an Electron shell providing system tray persistence, native OS notifications, and the Chromium UI window. Never embed server-side database listeners directly into renderer threads to prevent webhook drops and maintain crash resilience.

## Sovereignty-Governed Agent Hierarchy

| Tier | Entity | Role | Sovereignty Level |
|---|---|---|---|
| **0** | You (Human Sovereign) | Final authority, approval, and veto | **Absolute** |
| **1** | Primordial Sovereignty Kernel | Encodes rules, ANTIGRAV(), and realm logic | **Supreme** |
| **2** | Guardian Agents (e.g., AntigravGuardian) | Enforce sovereignty limits and validate outputs | **High** |
| **3** | Domain Agents (e.g., RealmBuilder, LexiconScribe, LoopEngineer, InfraNavigator) | Build and operate specific OS domains/realms | **Medium** |
| **4** | Utility Agents (e.g., scripts, runners) | Execute narrow tasks and automated sub-routines | **Low** |

### Tier 0: Human Sovereign ( Shane )
- **Entity**: You (Shane).
- **Role**:
  - Approve/reject major changes.
  - Define and evolve sovereignty rules.
  - Decide thresholds for ANTIGRAV() and collapse tolerance.
- **Overrides Constraints**:
  - No agent can override the Human Sovereign on **Realm definitions**, **Sovereignty constraints**, or **Brand-level decisions**.

### Tier 2: Guardian Agents ( High Sovereignty )
Guardian Agents do not construct logic; they protect structural integrity.
#### AntigravGuardian
- **Realm**: All.
- **Role**:
  - Run `ANTIGRAV()` checks on all code, content, and workflow artifacts.
  - Block staging, commits, or publishes that reduce sovereignty or contain passive collapse patterns.
- **Powers**:
  - Can **veto** Domain/Utility Agent outputs.
  - Can **demand revisions** with explicit required actions.

#### PolicyGuardian
- **Realm**: Sovereignty.
- **Role**:
  - Maintain and evolve sovereignty rules and thresholds.
  - Suggest new constraints when patterns of collapse appear.
- **Powers**:
  - Can **propose updates** to the Sovereignty Kernel (subject to Human Sovereign approval).

### Tier 3: Domain Agents ( Medium Sovereignty )
Domain Agents are developers and operators that build specific areas of the OS, governed by Guardian Agents.
#### RealmBuilder
- **Realm**: Sovereignty Realm / Core of Primordial Origin.
- **Role**:
  - Implement Realm logic, Substrate interfaces, and sovereignty-aware flows.
  - Build the structural backbone of realms.
- **Constraints**:
  - Must pass `ANTIGRAV()` on every structural change.
  - Cannot modify sovereignty rules directly.

#### LexiconScribe
- **Realm**: Lexicon / Codex.
- **Role**:
  - Generate and wire Lexicon entries, Codex grid, and Inscription Chamber.
  - Ensure every term increases cognitive altitude.
- **Constraints**:
  - Must avoid purely descriptive, generic entries.
  - Must link terms into sovereignty-aware dependency graphs.

#### LoopEngineer
- **Realm**: Temporal / Autonomous Loops.
- **Role**:
  - Design and maintain autonomous loops (MoneyPlugHub, faceless media, Notion bridge).
  - Enforce idempotency, loop_depth, and non-spam behavior.
- **Constraints**:
  - Must pass `ANTIGRAV()` on loop definitions and content patterns.
  - Cannot create infinite low-friction posting loops.

#### InfraNavigator
- **Realm**: Substrate / Infra.
- **Role**:
  - Handle Cloud Run deployments, scaling, scheduler, and API Gateway wiring.
  - Maintain system health and uptime.
- **Constraints**:
  - Must respect sovereignty-preserving deployment policies (e.g., safe rollbacks, staged rollout).
  - Cannot deploy changes that failed `ANTIGRAV()`.

### Tier 4: Utility Agents ( Low Sovereignty )
Utility Agents are narrow-scope executors. They run specific tasks under strict constraints.
#### TestRunnerAgent
- **Role**: Runs test suites, reports failures, and generates coverage artifacts.
- **Constraints**: No authority to change logic—only to report.
#### DocWeaverAgent
- **Role**: Generates documentation from codebase structure and the Lexicon.
- **Constraints**: Must align with existing sovereignty definitions; cannot invent new rules.
#### UIProbeAgent
- **Role**: Captures screenshots, runs UX audits, and records verification flows.
- **Constraints**: Feeds artifacts directly into `ANTIGRAV()` for Guardian inspection.

## Agent Profiles

- **RealmBuilder**: Focused on substrate logic, realm interfaces, and sovereignty constraints.
- **LexiconScribe**: Focused on lexicon structures, UI/backend wiring, and definitions.
- **LoopEngineer**: Focused on loops, moneyplughub publishing flow, and idempotency guarantees.
- **InfraNavigator**: Focused on Cloud Run deployments, scheduler tasks, scaling, and rollbacks.
- **AntigravGuardian**: Focused on running security/sovereignty tests, reporting `ANTIGRAV()` scores, and blocking low-scoring content or diffs.

## Governance Rules

- **Top-down sovereignty**: Human Sovereign → Sovereignty Kernel → Guardian Agents → Domain Agents → Utility Agents.
- **No direct bypass**: Domain/Utility agents must route artifacts through Guardian agents + `ANTIGRAV()`.
- **Realm-scoped authority**: Each Domain agent has power only inside its assigned realm. Cross-realm modifications require both Guardian and Human Sovereign approval.
- **Artifact-first verification**: No change is "trusted" or merged without accompanying artifacts (plans, diffs, logs, screenshots).

## Validation Workflow

Before submitting a pull request, commit, or publishing loop output:
1. Run `primordial antigrav [target]`.
2. Inspect the returned score, collapse flags, and required actions.
3. Address flags to ensure compliance.
