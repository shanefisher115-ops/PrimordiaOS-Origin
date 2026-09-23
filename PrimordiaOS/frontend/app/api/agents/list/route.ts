import { NextResponse } from 'next/server';

export async function GET() {
  const agents = [
    { id: 'content-daemon', status: 'online', capabilities: ['write', 'summarize', 'expand'] },
    { id: 'vfx-daemon', status: 'idle', capabilities: ['render', 'compose', 'simulate'] },
    { id: 'voice-daemon', status: 'online', capabilities: ['synthesize', 'clone', 'modulate'] }
  ];

  return NextResponse.json({ agents });
}
