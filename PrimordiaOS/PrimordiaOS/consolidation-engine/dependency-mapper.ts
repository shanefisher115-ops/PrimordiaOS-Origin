import fs from "fs";
import path from "path";

export async function mapDependencies(items: any[]) {
  const graph: any = {};

  items.forEach(item => {
    try {
      // Only parse text-based code files
      if (![".js", ".ts", ".mjs", ".cjs", ".json", ".ps1", ".py"].includes(item.ext)) return;

      const content = fs.readFileSync(item.filePath, "utf8");

      const imports = [...content.matchAll(/from ["'](.+)["']/g)].map(
        m => m[1]
      );

      graph[item.name] = {
        imports,
        realm: item.realm,
        category: item.category
      };
    } catch {
      // Ignore unreadable/binary files
    }
  });

  const outPath = path.join(
    process.cwd(),
    "primordiaos",
    "config",
    "dependency-map.json"
  );

  const targetDir = path.dirname(outPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(graph, null, 2), "utf-8");
}
