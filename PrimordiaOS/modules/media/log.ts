export function log(stage: string, message: string, data?: any) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [PrimordiaMedia:${stage}] ${message}`;
  if (data) {
    console.log(base, JSON.stringify(data));
  } else {
    console.log(base);
  }
}
