// osmium/ledger.js
import fs from "fs";
import path from "path";

const LEDGER_DIR = path.resolve("osmium/data");

// Ensure directory exists
if (!fs.existsSync(LEDGER_DIR)) {
    fs.mkdirSync(LEDGER_DIR, { recursive: true });
}

export function write(channel, entry) {
    const timestamp = new Date().toISOString();
    const line = JSON.stringify({ timestamp, ...entry }) + "\n";

    const filePath = path.join(LEDGER_DIR, `${channel}.ledger`);
    fs.appendFileSync(filePath, line);

    console.log(`[osmium] wrote entry to ${channel}`);
}

export function read(channel) {
    const filePath = path.join(LEDGER_DIR, `${channel}.ledger`);
    if (!fs.existsSync(filePath)) return [];

    const lines = fs.readFileSync(filePath, "utf8")
        .trim()
        .split("\n")
        .map(JSON.parse);

    return lines;
}
