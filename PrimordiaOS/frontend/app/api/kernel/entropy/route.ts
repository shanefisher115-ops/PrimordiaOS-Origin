import { NextResponse } from 'next/server';

export async function GET() {
  // Later this will pull real entropy loop metrics from your kernel.
  // For now, it's a structured placeholder that matches your OS design.

  const entropy = {
    cycles: 87,                     // number of completed entropy cycles
    queuedTasks: 5,                 // tasks waiting in the loop
    activeAgents: 3,                // agents currently executing tasks
    heat: Math.random(),            // entropy heat (0–1)
    lastCycleAt: new Date().toISOString(),
  };

  return NextResponse.json(entropy);
}
