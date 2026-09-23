"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const primordia_1 = require("@/lib/primordia");
function GET() {
    const applets = (0, primordia_1.normalizeAppletRegistry)(primordia_1.sampleSpannerRegistry);
    return server_1.NextResponse.json({
        schemaVersion: "1.0.0",
        registryName: "Primordia Applet Registry",
        generatedAt: "2026-07-28T00:00:00.000Z",
        appletCount: applets.length,
        applets
    });
}
