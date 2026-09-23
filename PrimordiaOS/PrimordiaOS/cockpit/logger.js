// cockpit/logger.js
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("cockpit/logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function log(channel, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${channel}] ${message}\n`;

    const filePath = path.join(LOG_DIR, `${channel}.log`);
    fs.appendFileSync(filePath, line);

    console.log(`[cockpit] ${line.trim()}`);
}
