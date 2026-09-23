"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootPrimordiaOS = bootPrimordiaOS;
const kernel_js_1 = require("../core/kernel.js");
const websocket_js_1 = require("../net/websocket.js");
async function bootPrimordiaOS() {
    console.log("=== PrimordiaOS Boot Sequence Initiated ===");
    kernel_js_1.Kernel.registerModule("ws", new websocket_js_1.PrimordiaWebSocket());
    kernel_js_1.Kernel.emit("kernel.boot");
    kernel_js_1.Kernel.markReady();
    console.log("=== PrimordiaOS Ready for Natural Language Commands ===");
    // Example: you can wire this to CLI, HTTP, or WS
    // interpretSentence("spawn a glowing cube in front of me");
}
