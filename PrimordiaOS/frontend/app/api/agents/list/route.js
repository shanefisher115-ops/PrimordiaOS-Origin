"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    const agents = [
        { id: 'content-daemon', status: 'online', capabilities: ['write', 'summarize', 'expand'] },
        { id: 'vfx-daemon', status: 'idle', capabilities: ['render', 'compose', 'simulate'] },
        { id: 'voice-daemon', status: 'online', capabilities: ['synthesize', 'clone', 'modulate'] }
    ];
    return server_1.NextResponse.json({ agents });
}
