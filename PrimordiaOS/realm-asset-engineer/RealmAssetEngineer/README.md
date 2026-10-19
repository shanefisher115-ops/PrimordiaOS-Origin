# RealmAssetEngineer

Autonomous realm-asset engineer: turns genre briefs into kernel recipes, judges the built pieces and curates the catalog

PrimordiaOS agent — Agent Container Standard v1, runtime v1.2. Capabilities: design, judge, curate.

| Realm | Run |
|---|---|
| dev (folder) | `node agent.js` (one loop) |
| local (Docker) | `docker build -f runtime/Dockerfile -t primordia-agent-realmassetengineer:1.0.0 .` then `docker run -p 8080:8080 -e PRIMORDIA_TOKEN=... primordia-agent-realmassetengineer:1.0.0` (HTTP service: `POST /inbox`, `POST /outbox/drain`, `POST /run`, `GET /status`) |
| cloud (Cloudflare) | local: copy `runtime/dev.vars.example` to `runtime/.dev.vars`, then `npx wrangler dev -c runtime/wrangler.toml` (port 8791) · deploy: `npx wrangler secret put PRIMORDIA_TOKEN -c runtime/wrangler.toml` then `npx wrangler deploy -c runtime/wrangler.toml` |

Register with the kernel: `primordia register .` (dev) · `primordia register . --realm local --endpoint http://localhost:8080` · `primordia register . --realm cloud --endpoint https://primordia-agent-realmassetengineer.<subdomain>.workers.dev`

Model guidance (optional): set `PRIMORDIA_KERNEL` + `PRIMORDIA_TOKEN` (folder/Docker) or `PRIMORDIA_KERNEL_URL` var + `PRIMORDIA_TOKEN` secret (Cloudflare); `decide()` then receives `state.advise(event, memory)`.
