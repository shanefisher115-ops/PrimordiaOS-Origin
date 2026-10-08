// packages/primordia-core/src/logger.ts
const isProduction = process.env.NODE_ENV === 'production';

export function telemetryLog(event: string, payload: any): void {
  if (isProduction) {
    // Compress telemetry payload reporting for production stdout
    const payloadString = JSON.stringify(payload);
    console.log(`[Telemetry] ${event} | status: OK | size: ${payloadString.length} bytes`);
  } else {
    console.log(`[Telemetry] ${event}`, JSON.stringify(payload, null, 2));
  }
}
