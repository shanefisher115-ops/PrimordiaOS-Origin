import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', ws => {
  console.log('Primordia Unreal bridge connected');
  ws.on('message', msg => console.log('From Unreal:', msg.toString()));
});
console.log('Primordia WebSocket server on :8080');