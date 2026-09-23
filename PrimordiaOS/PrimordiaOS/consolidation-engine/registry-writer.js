import fs from "fs";
import path from "path";
export async function writeRegistry(items) {
    const registryPath = path.join(process.cwd(), "primordiaos", "config", "registry.json");
    const registry = {
        system: "PrimordiaOS Unified Module Registry",
        generated_at: new Date().toISOString(),
        total_modules: items.length,
        modules: items.map(i => ({
            name: i.name,
            category: i.category,
            realm: i.realm,
            filePath: i.filePath,
            status: i.status
        }))
    };
    const targetDir = path.dirname(registryPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf-8");
}
