/**
 * ==============================================================================
 * ⚡ CLI / TERMINAL RAIL
 * Formatted streaming alert output for interactive terminal sessions & CLIs.
 * ==============================================================================
 */
export class CliStreamChannel {
    static subscribers = new Set();
    static subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    static async send(signal, urgency) {
        const start = Date.now();
        try {
            // ANSI color codes (safe fallback on plain terminals)
            const colorCode = urgency === 'critical'
                ? '\x1b[1;31m' // Bright Red
                : urgency === 'high'
                    ? '\x1b[1;33m' // Bright Yellow
                    : urgency === 'medium'
                        ? '\x1b[1;36m' // Cyan
                        : '\x1b[0;37m'; // White
            const resetCode = '\x1b[0m';
            const cleanTitle = signal.title.replace(/\r?\n/g, ' ').slice(0, 65);
            const urlOrPath = signal.url || `/signals/${signal.id}`;
            const formattedLine = `${colorCode}[ALERT][${urgency.toUpperCase()}][${signal.score}][${signal.source}]${resetCode} ${cleanTitle} · ${urlOrPath}`;
            // 1. Direct stdout write
            process.stdout.write(`\n${formattedLine}\n`);
            // 2. Notify subscribers
            for (const sub of this.subscribers) {
                try {
                    sub(formattedLine);
                }
                catch { }
            }
            return {
                channel: 'cli',
                success: true,
                deliveredAt: Date.now(),
                metadata: {
                    formattedLine,
                    latencyMs: Date.now() - start
                }
            };
        }
        catch (err) {
            return {
                channel: 'cli',
                success: false,
                deliveredAt: Date.now(),
                error: err.message
            };
        }
    }
}
