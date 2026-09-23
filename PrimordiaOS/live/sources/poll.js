// PrimordiaOS Live Data Poller
// Reads /live/sources/config.json
// Polls each source on its interval
// Writes raw results to /live/sources/raw/[source].json
// Triggers signal processor

import fs from 'fs';
import fetch from 'node-fetch';

const configPath = '/primordiaos/live/sources/config.json';
const rawDir = '/primordiaos/live/sources/raw/';
const signalProcessor = '/primordiaos/live/signals/processor.js';

function loadConfig() {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function pollSource(name, source) {
    try {
        const response = await fetch(source.endpoint);
        const data = await response.json();

        fs.writeFileSync(
            `${rawDir}${name}.json`,
            JSON.stringify({ timestamp: Date.now(), data }, null, 2)
        );

        console.log(`[PrimordiaOS] Polled ${name}`);
    } catch (err) {
        console.error(`[PrimordiaOS] Poll error for ${name}:`, err);
    }
}

function schedulePolling() {
    const config = loadConfig();

    Object.entries(config).forEach(([name, source]) => {
        if (!source.enabled) return;

        setInterval(() => {
            pollSource(name, source);
            runSignalProcessor();
        }, source.poll_interval_seconds * 1000);
    });
}

function runSignalProcessor() {
    try {
        const processor = require(signalProcessor);
        processor.processSignals();
    } catch (err) {
        console.error('[PrimordiaOS] Signal processor error:', err);
    }
}

schedulePolling();
