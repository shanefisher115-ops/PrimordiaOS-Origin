import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTTP_PORT = process.env.PORT || 8888;

let streamerConn = null;
const clientConns = new Set();

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrimordiaOS Pixel Stream</title>
  <style>
    body { margin: 0; background: #08090c; color: #fff; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    .status { position: absolute; top: 16px; left: 16px; background: rgba(0,240,255,0.1); border: 1px solid #00f0ff; color: #00f0ff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }
    video { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <div class="status" id="statusLabel">Connecting to PrimordiaOS Stream...</div>
  <video id="streamingVideo" autoplay playsinline muted></video>
  <script>
    const statusLabel = document.getElementById('statusLabel');
    const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => { statusLabel.innerText = 'Connected to Signaling Server (Waiting for Streamer)...'; };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'streamerConnected') {
          statusLabel.innerText = 'Streamer Online - Establishing WebRTC Peer Connection...';
        }
      } catch (e) {}
    };
    ws.onclose = () => { statusLabel.innerText = 'Disconnected from Signaling Server'; };
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlTemplate);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log(`[PixelStreamServer] New WebSocket connection from ${req.socket.remoteAddress}`);

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      return;
    }

    if (data.type === 'endpointId' || data.type === 'streamer') {
      streamerConn = ws;
      console.log('[PixelStreamServer] Unreal Engine Streamer registered!');
      clientConns.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'streamerConnected' }));
        }
      });
      return;
    }

    if (ws === streamerConn) {
      // Broadcast from streamer to clients
      clientConns.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    } else {
      // Client connection
      clientConns.add(ws);
      if (streamerConn && streamerConn.readyState === WebSocket.OPEN) {
        streamerConn.send(message.toString());
      }
    }
  });

  ws.on('close', () => {
    if (ws === streamerConn) {
      console.log('[PixelStreamServer] Streamer disconnected.');
      streamerConn = null;
    } else {
      clientConns.delete(ws);
    }
  });
});

server.listen(HTTP_PORT, () => {
  console.log(`==========================================================`);
  console.log(` PrimordiaOS Pixel Streaming Signaling Server`);
  console.log(` Listening on http://127.0.0.1:${HTTP_PORT}`);
  console.log(`==========================================================`);
});
