// storage/file-store.ts
// PrimordiaOS File Store — full implementation
// Simple JSON-based file storage for persistent data

import fs from "fs";
import path from "path";

export class FileStore {
    private baseDir: string;

    constructor(baseDir = "data") {
        this.baseDir = path.resolve(baseDir);

        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    private getPath(key: string) {
        return path.join(this.baseDir, `${key}.json`);
    }

    save(key: string, value: any) {
        const filePath = this.getPath(key);
        fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    }

    load<T = any>(key: string): T | null {
        const filePath = this.getPath(key);
        if (!fs.existsSync(filePath)) return null;

        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw) as T;
    }

    delete(key: string) {
        const filePath = this.getPath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    list(): string[] {
        return fs.readdirSync(this.baseDir)
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""));
    }
}

export const fileStore = new FileStore("primordia-storage");
