"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kernel = exports.PrimordiaKernel = void 0;
class PrimordiaKernel {
    modules = {};
    events = {};
    ready = false;
    init() {
        this.ready = true;
        console.log("[PrimordiaOS] Kernel initialized");
    }
    register(name, module) {
        this.modules[name] = module;
        console.log(`[PrimordiaOS] Module registered: ${name}`);
    }
    on(event, handler) {
        if (!this.events[event])
            this.events[event] = [];
        this.events[event].push(handler);
    }
    emit(event, payload) {
        const listeners = this.events[event] || [];
        for (const fn of listeners)
            fn(payload);
    }
    handleIntent(intent) {
        const { agent, action, payload } = intent;
        if (!this.modules[agent]) {
            return { ok: false, msg: `Unknown agent: ${agent}` };
        }
        const module = this.modules[agent];
        if (typeof module[action] !== "function") {
            return { ok: false, msg: `Unknown action: ${action}` };
        }
        try {
            const result = module[action](payload);
            return { ok: true, result };
        }
        catch (err) {
            return { ok: false, msg: String(err) };
        }
    }
}
exports.PrimordiaKernel = PrimordiaKernel;
exports.Kernel = new PrimordiaKernel();
