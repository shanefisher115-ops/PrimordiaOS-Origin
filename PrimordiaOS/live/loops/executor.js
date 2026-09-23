// PrimordiaOS Loop Executor
// Reads signals from /live/signals/stream.json
// Maps signals to realms via /live/realms/map.json
// Executes the correct loop files in /live/loops/

import fs from 'fs';

const streamPath = '/primordiaos/live/signals/stream.json';
const mapPath = '/primordiaos/live/realms/map.json';
const loopsDir = '/primordiaos/live/loops/';

function loadJSON(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function executeLoop(loopFile) {
    const fullPath = loopsDir + loopFile;

    if (!fs.existsSync(fullPath)) {
        console.error(`[PrimordiaOS] Loop file not found: ${loopFile}`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    console.log(`\n[PrimordiaOS] Executing loop: ${loopFile}`);
    console.log(content);
}

export function runExecutor() {
    const stream = loadJSON(streamPath);
    const map = loadJSON(mapPath);

    if (!stream.signals || stream.signals.length === 0) {
        console.log('[PrimordiaOS] No signals to process.');
        return;
    }

    console.log('[PrimordiaOS] Processing signals:', stream.signals);

    stream.signals.forEach(signal => {
        const realms = map[signal];

        if (!realms) {
            console.log(`[PrimordiaOS] No realm mapped for signal: ${signal}`);
            return;
        }

        realms.forEach(realm => {
            const loopFile = `${realm}-loop.md`;
            executeLoop(loopFile);
        });
    });

    // Clear signals after execution
    stream.signals = [];
    fs.writeFileSync(streamPath, JSON.stringify(stream, null, 2));

    console.log('[PrimordiaOS] Loop execution complete.');
}
