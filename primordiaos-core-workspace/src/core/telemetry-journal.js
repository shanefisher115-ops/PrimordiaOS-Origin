const fs = require('fs');
const path = require('path');

class TelemetryJournal {
    constructor(dbPath = './data/telemetry.log') {
        this.dbPath = path.resolve(dbPath);
        this.ensureDir();
    }

    ensureDir() {
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    record(event, metrics) {
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            ...metrics
        };
        fs.appendFileSync(this.dbPath, JSON.stringify(entry) + '\n', 'utf8');
    }

    getRecent(limit = 50) {
        if (!fs.existsSync(this.dbPath)) return [];
        const lines = fs.readFileSync(this.dbPath, 'utf8').trim().split('\n');
        return lines.slice(-limit).map(l => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
    }
}

module.exports = { TelemetryJournal };