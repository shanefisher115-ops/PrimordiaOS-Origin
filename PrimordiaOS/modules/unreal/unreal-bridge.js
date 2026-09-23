import WebSocket from 'ws';
export const unrealBridge = () => {
    const ws = new WebSocket('wss://primordialorigin.com/ws');
    ws.on('open', () => {
        console.log('PrimordiaOS ? Unreal handshake connected');
        ws.send(JSON.stringify({ event: 'PrimordiaOnline' }));
    });
    ws.on('message', (msg) => {
        console.log('Unreal ? PrimordiaOS:', msg.toString());
    });
};
