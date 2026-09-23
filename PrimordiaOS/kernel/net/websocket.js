"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WS = exports.PrimordiaWebSocket = void 0;
class PrimordiaWebSocket {
    ws = null;
    attach(ws) {
        this.ws = ws;
    }
    send(data) {
        if (!this.ws)
            return;
        this.ws.send(JSON.stringify(data));
    }
    onMessage(handler) {
        if (!this.ws)
            return;
        this.ws.on("message", (raw) => {
            try {
                handler(JSON.parse(raw.toString()));
            }
            catch {
                handler(raw.toString());
            }
        });
    }
}
exports.PrimordiaWebSocket = PrimordiaWebSocket;
exports.WS = new PrimordiaWebSocket();
