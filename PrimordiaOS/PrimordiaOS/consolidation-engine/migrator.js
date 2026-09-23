import fs from "fs";
import path from "path";
export async function migrateItem(item) {
    const targetDir = path.join(process.cwd(), "primordiaos", item.category);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, item.name);
    if (!fs.existsSync(targetPath)) {
        try {
            fs.copyFileSync(item.filePath, targetPath);
        }
        catch {
            // Safely ignore locked or permission-restricted files
        }
    }
    return targetPath;
}
