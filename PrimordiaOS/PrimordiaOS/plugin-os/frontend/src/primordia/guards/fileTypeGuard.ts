export function validateFileType(filename: string): boolean {
  const forbidden = [".cjs", ".mjs", ".jsx"];
  return !forbidden.some(ext => filename.endsWith(ext));
}

export function validateDirectory(path: string): boolean {
  const forbiddenDirs = ["node_modules", ".next", "root"];
  return !forbiddenDirs.some(dir => path.includes(dir));
}
