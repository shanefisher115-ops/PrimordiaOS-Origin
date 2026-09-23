const API = "http://127.0.0.1:8787";
export function startSandbox() {
    console.log("[PrimordiaOS] Sandbox starting…");
    fetch(`${API}/health`)
        .then(r => r.text())
        .then(msg => console.log("[PrimordiaOS] Backend OK:", msg))
        .catch(err => console.error("[PrimordiaOS] Backend unreachable:", err));
}
