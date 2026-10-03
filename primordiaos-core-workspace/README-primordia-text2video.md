# PrimordiaOS Text-to-Video Skeleton

- Run WebSocket bridge:  node runtime/ws-server.js
- Send prompt:          node cli/prompt.js \"spawn pulse in nebula\"
- Unreal side:          hook WebSocket client to :8080 and map events to Niagara / Sequencer.