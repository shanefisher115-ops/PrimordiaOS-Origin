import { NextResponse } from "next/server";
import { normalizeAppletRegistry, sampleSpannerRegistry } from "@/lib/primordia";

export function GET() {
  const applets = normalizeAppletRegistry(sampleSpannerRegistry);

  return NextResponse.json({
    schemaVersion: "1.0.0",
    registryName: "Primordia Applet Registry",
    generatedAt: "2026-07-28T00:00:00.000Z",
    appletCount: applets.length,
    applets
  });
}
