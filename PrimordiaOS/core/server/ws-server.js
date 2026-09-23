import { serve } from "https://deno.land/std/http/server.ts";
const clients = new Set();
function broadcast(message) {
    const data = JSON.stringify(message);
    for (const ws of clients)
        ws.send(data);
}
serve((req) => {
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = () => clients.add(socket);
    socket.onclose = () => clients.delete(socket);
    socket.onmessage = (ev) => {
        console.log("From engine:", ev.data);
    };
    return response;
}, { port: 8010 });
export function emitEngineEvent(event) {
    broadcast(event);
}
