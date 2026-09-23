import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 17800 });
wss.on('connection', (ws) => {
    console.log('Unreal ↔ PrimordiaOS handshake established');
    ws.send(JSON.stringify({ event: 'PrimordiaOnline' }));
    ws.on('message', (msg) => {
        console.log('Unreal → PrimordiaOS:', msg.toString());
    });
});
console.log('PrimordiaOS WebSocket listening on ws://localhost:17800');
