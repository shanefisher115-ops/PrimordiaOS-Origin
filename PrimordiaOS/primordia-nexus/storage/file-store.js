// storage/file-store.ts
// PrimordiaOS File Store — full implementation
// Simple JSON-based file storage for persistent data
import fs from "fs";
import path from "path";
export class FileStore {
    baseDir;
    constructor(baseDir = "data") {
        this.baseDir = path.resolve(baseDir);
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    getPath(key) {
        return path.join(this.baseDir, `${key}.json`);
    }
    save(key, value) {
        const filePath = this.getPath(key);
        fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    }
    load(key) {
        const filePath = this.getPath(key);
        if (!fs.existsSync(filePath))
            return null;
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    }
    delete(key) {
        const filePath = this.getPath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    list() {
        return fs.readdirSync(this.baseDir)
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""));
    }
}
export const fileStore = new FileStore("primordia-storage");
