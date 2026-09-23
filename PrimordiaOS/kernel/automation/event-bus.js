"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.emit = emit;
const handlers = [];
function registerHandler(handler) {
    handlers.push(handler);
}
async function emit(event) {
    for (const h of handlers) {
        await h(event);
    }
}
