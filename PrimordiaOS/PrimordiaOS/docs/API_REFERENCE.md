# PrimordiaOS API Reference & Protocol Specification

## 1. REST Endpoints (Port 3000)

### `GET /health` or `GET /api/health`
Returns health check status and spine boot state.

### `GET /api/status`
Returns complete status of the PrimordiaSpine, registered realms, agents, pipelines, and state snapshot.

### `GET /api/realms`
Returns active status and metrics for all 5 continuous realms.

### `GET /api/stream`
Server-Sent Events (SSE) stream broadcasting all real-time events on the universal bus.

### `POST /api/trigger-bigbang`
Broadcasts the Big Bang / Genesis event to Unreal Engine and Niagara emitters on ws://localhost:17800.

### `POST /api/trigger-pulse`
Forces an immediate execution of the MoneyPlugHub autonomous monetization cycle.

### `GET /api/antigrav/audit`
Runs an on-demand `ANTIGRAV()` audit by the AntigravGuardian (Tier 2).

---

## 2. WebSocket Server (Port 17800)

- **URL**: `ws://localhost:17800`
- **Clients**: Unreal Engine 5, Niagara Particle Emitters, Web HUD Overlay.
- **Messages**:
  - Outgoing: `{ type: "BIG_BANG_TRIGGER", payload: { genesis: true, niagara_system: "NS_PrimordiaBigBang" } }`
  - Outgoing: `{ type: "telemetry_update", data: { status: "active" } }`
  - Incoming: `{ type: "UNREAL_PLAY_STARTED" }`
  - Incoming: `{ type: "BIG_BANG_INITIALIZED" }`

---

## 3. CLI Commands

```bash
# Query master spine status
node primordiaos/interfaces/cli.js status

# Run ANTIGRAV() sovereignty audit
node primordiaos/interfaces/cli.js antigrav

# Trigger Big Bang in Unreal Engine
node primordiaos/interfaces/cli.js bigbang

# Trigger autonomous monetization pulse
node primordiaos/interfaces/cli.js pulse
```
