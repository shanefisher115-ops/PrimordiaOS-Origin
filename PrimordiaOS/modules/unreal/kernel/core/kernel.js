export class Kernel {
    static state = { status: "booting" };
    static init() {
        console.log("[Kernel] Initialized.");
        Kernel.state.status = "ready";
    }
    static handleIntent(intent) {
        return { ok: true, intent };
    }
}
