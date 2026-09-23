```mermaid

flowchart TD



&#x20;   %% ============================

&#x20;   %%   PRIMORDIAOS CONSTELLATION

&#x20;   %% ============================



&#x20;   subgraph ACTIVE\["🌌 PrimordiaOS — Active Constellation"]

&#x20;       ROOT\["📁 C:\\\\Users\\\\Shane\\\\PrimordiaOS"]



&#x20;       subgraph BACKEND\["⚙️ Backend — primordiaos-backend"]

&#x20;           CORE\["src/core\\n@primordiaos/core"]

&#x20;           KERNEL\["src/kernel\\n@primordiaos/kernel"]

&#x20;           BUS\["src/bus\\n@primordiaos/bus"]

&#x20;           MODULES\["src/modules\\nOsmium • Vertex • VisionCore • MoneyPlugHub"]

&#x20;       end



&#x20;       subgraph FRONTEND\["🎨 Frontend — primordiaos-frontend"]

&#x20;           UI\["src/ui\\n@primordiaos/ui"]

&#x20;           ALIAS\_CORE\["@primordiaos/core → ../backend/src/core"]

&#x20;       end



&#x20;       LOGS\["🗄 logs/"]

&#x20;       TELEMETRY\["📡 telemetry/"]

&#x20;   end





&#x20;   %% ============================

&#x20;   %%   ARCHIVE CONSTELLATION

&#x20;   %% ============================



&#x20;   subgraph ARCHIVE\["🗃 PrimordiaOS\_Archive — Legacy Constellation"]

&#x20;       LEGACY\_ROOT\["📁 C:\\\\Users\\\\Shane\\\\PrimordiaOS\_Archive\\\\legacy"]



&#x20;       PLUGINOS\["PlugInOS"]

&#x20;       PRIMORDIALOS\["PrimordialOS"]

&#x20;       MASTER\["PrimordiaOS\_Master"]

&#x20;       CLOUDRUN\["primordia-cloudrun"]

&#x20;       REDIRECT\["primordia-redirect-engine"]

&#x20;       CODEX\["primordia-codex-integration"]

&#x20;       WEBHOOK\["primordia-webhook"]

&#x20;       ORIGIN\["primordial-origin"]

&#x20;       PRIMORDIAL\["primordial"]

&#x20;       FLOW\["primordiaflow"]

&#x20;   end





&#x20;   %% ============================

&#x20;   %%   CONNECTIONS

&#x20;   %% ============================



&#x20;   ROOT --> BACKEND

&#x20;   ROOT --> FRONTEND

&#x20;   ROOT --> LOGS

&#x20;   ROOT --> TELEMETRY



&#x20;   FRONTEND --> ALIAS\_CORE

&#x20;   BACKEND --> MODULES

&#x20;   BACKEND --> BUS

&#x20;   BACKEND --> KERNEL

&#x20;   BACKEND --> CORE



&#x20;   ROOT -. safe archived .-> ARCHIVE

&#x20;   ARCHIVE --> LEGACY\_ROOT



&#x20;   LEGACY\_ROOT --> PLUGINOS

&#x20;   LEGACY\_ROOT --> PRIMORDIALOS

&#x20;   LEGACY\_ROOT --> MASTER

&#x20;   LEGACY\_ROOT --> CLOUDRUN

&#x20;   LEGACY\_ROOT --> REDIRECT

&#x20;   LEGACY\_ROOT --> CODEX

&#x20;   LEGACY\_ROOT --> WEBHOOK

&#x20;   LEGACY\_ROOT --> ORIGIN

&#x20;   LEGACY\_ROOT --> PRIMORDIAL

&#x20;   LEGACY\_ROOT --> FLOW



