import { NextResponse } from 'next/server';

export async function GET() {
  const kernelStatus = {
    online: true,
    uptimeSeconds: 12345,
    entropyLoopActive: true,
    lastCycleAt: new Date().toISOString(),
  };

  return NextResponse.json(kernelStatus);
}
