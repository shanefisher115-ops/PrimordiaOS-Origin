// PrimordiaOS Signal Processor
// Reads raw data from /live/sources/raw/
// Writes normalized signals to /live/signals/stream.json

import fs from 'fs';

const rawDir = '/primordiaos/live/sources/raw/';
const streamPath = '/primordiaos/live/signals/stream.json';

export function processSignals() {
    const signals = [];

    const files = fs.readdirSync(rawDir);

    files.forEach(file => {
        const raw = JSON.parse(fs.readFileSync(rawDir + file, 'utf8'));
        const name = file.replace('.json', '');
        const data = raw.data;

        // --- SIGNAL RULES ---
        if (name === 'affiliate_stats' && data.conversions > 0) {
            signals.push('NEW_AFFILIATE_CONVERSION');
        }

        if (name === 'traffic_stats' && data.today > data.yesterday * 1.5) {
            signals.push('TRAFFIC_SPIKE');
        }

        if (name === 'traffic_stats' && data.today < data.yesterday * 0.5) {
            signals.push('TRAFFIC_DROP');
        }

        if (name === 'bank_balance' && data.balance !== data.previous_balance) {
            signals.push('BALANCE_CHANGED');
        }

        if (name === 'affiliate_stats' && data.today_earnings === 0) {
            signals.push('ZERO_EARNINGS_TODAY');
        }
    });

    // Write signals to stream
    const stream = JSON.parse(fs.readFileSync(streamPath, 'utf8'));
    stream.signals.push(...signals);

    fs.writeFileSync(streamPath, JSON.stringify(stream, null, 2));

    console.log('[PrimordiaOS] Signals processed:', signals);
}
