"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    const kernelStatus = {
        online: true,
        uptimeSeconds: 12345,
        entropyLoopActive: true,
        lastCycleAt: new Date().toISOString(),
    };
    return server_1.NextResponse.json(kernelStatus);
}
