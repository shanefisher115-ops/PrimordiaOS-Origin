import { WebSocket } from 'ws';

const SIGNALING_URL = 'ws://127.0.0.1:8888';

console.log(`[PrimordiaStreamerSim] Connecting to Pixel Streaming Signaling Server at ${SIGNALING_URL}...`);

const ws = new WebSocket(SIGNALING_URL);

ws.on('open', () => {
  console.log('[PrimordiaStreamerSim] Connected! Registering as Unreal Engine Pixel Streaming Streamer...');
  ws.send(JSON.stringify({
    type: 'streamer',
    streamerId: 'PrimordiaUnrealEngineInstance',
    engineVersion: '5.4'
  }));

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
        fps: 60,
        bitrateKbps: 4500
      }));
      console.log('[PrimordiaStreamerSim] Sent 3D Stream telemetry pulse (60 FPS @ 4.5 Mbps)...');
    }
  }, 3000);
});

ws.on('message', (data) => {
  console.log('[PrimordiaStreamerSim] Received signaling message:', data.toString());
});

ws.on('close', () => {
  console.log('[PrimordiaStreamerSim] Streamer connection closed.');
});

ws.on('error', (err) => {
  console.error('[PrimordiaStreamerSim] WebSocket error:', err.message);
});
