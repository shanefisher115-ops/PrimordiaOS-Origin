import fs from "fs";
import path from "path";
export function archiveItem(item) {
    const archiveDir = path.join(process.cwd(), "primordiaos", "archive");
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }
    const target = path.join(archiveDir, item.name);
    try {
        fs.copyFileSync(item.filePath, target);
    }
    catch {
        // Ignore restricted files
    }
}
