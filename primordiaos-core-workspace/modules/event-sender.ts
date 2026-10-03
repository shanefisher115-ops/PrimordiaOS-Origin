import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:8080');
export function sendEvent(evt) { ws.send(JSON.stringify(evt)); }