type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, meta?: unknown) {
  const payload = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
  // Simple console logger for now; can swap to Winston/Datadog later
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

export const Logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
};
