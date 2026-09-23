export function log(stage, message, data) {
    const ts = new Date().toISOString();
    const base = `[${ts}] [PrimordiaMedia:${stage}] ${message}`;
    if (data) {
        console.log(base, JSON.stringify(data));
    }
    else {
        console.log(base);
    }
}
