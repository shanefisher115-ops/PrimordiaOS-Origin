/**
 * ==============================================================================
 * ⭐ PHOM SDK — PLUGIN SYSTEM
 * Modular extensibility for enterprise workflows, custom AI models, and CRM integrations.
 * ==============================================================================
 */
export class PhomPluginRegistry {
    plugins = new Map();
    register(plugin) {
        if (this.plugins.has(plugin.name)) {
            console.warn(`[PhomPluginRegistry] Overwriting existing plugin: ${plugin.name}`);
        }
        this.plugins.set(plugin.name, plugin);
    }
    get(name) {
        return this.plugins.get(name);
    }
    has(name) {
        return this.plugins.has(name);
    }
    list() {
        return Array.from(this.plugins.values());
    }
    unregister(name) {
        return this.plugins.delete(name);
    }
    async runBeforePipeline(context) {
        for (const p of this.plugins.values()) {
            if (p.onBeforePipeline) {
                try {
                    await p.onBeforePipeline(context);
                }
                catch (e) {
                    console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onBeforePipeline:`, e.message);
                }
            }
        }
    }
    async runAfterPipeline(context) {
        for (const p of this.plugins.values()) {
            if (p.onAfterPipeline) {
                try {
                    await p.onAfterPipeline(context);
                }
                catch (e) {
                    console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onAfterPipeline:`, e.message);
                }
            }
        }
    }
    async filterSignal(signal) {
        let current = signal;
        for (const p of this.plugins.values()) {
            if (p.onSignal) {
                try {
                    current = await p.onSignal(current);
                }
                catch (e) {
                    console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onSignal:`, e.message);
                }
            }
        }
        return current;
    }
    async filterProspect(prospect) {
        let current = prospect;
        for (const p of this.plugins.values()) {
            if (p.onProspect) {
                try {
                    current = await p.onProspect(current);
                }
                catch (e) {
                    console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onProspect:`, e.message);
                }
            }
        }
        return current;
    }
    async filterOutbound(text, prospect) {
        let current = text;
        for (const p of this.plugins.values()) {
            if (p.onOutbound) {
                try {
                    current = await p.onOutbound(current, prospect);
                }
                catch (e) {
                    console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onOutbound:`, e.message);
                }
            }
        }
        return current;
    }
}
export const defaultPluginRegistry = new PhomPluginRegistry();
