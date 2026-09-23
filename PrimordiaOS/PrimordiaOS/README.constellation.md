🌌 PrimordiaOS — Constellation Architecture

PrimordiaOS is a multi‑realm operating system composed of a unified backend kernel, a cockpit‑grade frontend interface, and a constellation of autonomous modules that operate as distributed engines.

All legacy branches have been safely archived, leaving one canonical constellation.



🏛️ Constellation Root

Code

C:\\Users\\Shane\\PrimordiaOS

This is the official OS root, containing:



backend/ — PrimordiaOS kernel, bus, core, modules



frontend/ — PrimordiaOS cockpit UI



logs/ — unified telemetry + runtime logs



telemetry/ — event stream + constellation signals



primordiaos-launch.ps1 — canonical boot sequence



⚙️ Backend — primordiaos-backend

Location:



Code

C:\\Users\\Shane\\PrimordiaOS\\backend

Package:



Code

"primordiaos-backend"

Backend Structure

Code

backend/

&#x20; src/

&#x20;   core/       → Workspace definitions (@primordiaos/core)

&#x20;   kernel/     → Execution loop, state machine (@primordiaos/kernel)

&#x20;   bus/        → Telemetry, event routing (@primordiaos/bus)

&#x20;   modules/    → Osmium, Vertex, VisionCore, MoneyPlugHub

Backend Responsibilities

System definitions



Kernel orchestration



Event bus + telemetry



Module execution



Constellation state management



🎨 Frontend — primordiaos-frontend

Location:



Code

C:\\Users\\Shane\\PrimordiaOS\\frontend

Package:



Code

"primordiaos-frontend"

Frontend Structure

Code

frontend/

&#x20; src/

&#x20;   ui/         → Cockpit interface (@primordiaos/ui)

Webpack + TS Aliases

js

alias\["@primordiaos/ui"]   = path.resolve(\_\_dirname, "src/ui")

alias\["@primordiaos/core"] = path.resolve(\_\_dirname, "../backend/src/core")

Frontend Responsibilities

Cockpit UI



Constellation visualization



Module dashboards



Kernel + bus telemetry display



🔩 Modules (Engines)

Located in:



Code

backend/src/modules

Included Engines

Osmium — ledger + atomic state



Vertex — AI gateway + inference routing



VisionCore — perception + analysis



MoneyPlugHub — autonomous loop manager



Each module is a self‑contained realm within the constellation.



🗃️ Archive Constellation

All legacy branches have been safely relocated to:



Code

C:\\Users\\Shane\\PrimordiaOS\_Archive\\legacy

Archived Projects

PlugInOS



PrimordialOS



PrimordiaOS\_Master



primordia-cloudrun



primordia-redirect-engine



primordia-codex-integration



primordia-webhook



primordial-origin



primordial



primordiaflow



These are preserved for historical reference but no longer active.



🚀 Launch Sequence

PrimordiaOS boots using:



Code

primordiaos-launch.ps1

Boot Steps

Initialize kernel



Start telemetry bus



Launch backend



Launch cockpit UI



Print constellation status



Logs are written to:



Code

C:\\Users\\Shane\\PrimordiaOS\\logs

🌠 Constellation Map

See:



Code

CONSTELLATION.md

Contains the full Mermaid diagram of the active + archived realms.



📡 Telemetry

All runtime signals, events, and constellation messages flow through:



Code

telemetry/

This directory acts as the OS’s event horizon.



🧬 Workspace Alignment

PrimordiaOS is aligned across:



VS Code workspace



Gemini project root



Unified backend + frontend



Canonical module paths



No duplicate Primordia variants



This ensures stable builds, clean imports, and consistent module resolution.



🔮 Status

The constellation is fully converged.

All validation checks passed.

PrimordiaOS is now ready for:



Hardening



Deployment



Documentation



Public launch



🌌 End of README.constellation.md

