function log(level, message, meta) {
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
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
};
