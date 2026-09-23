/**
 * ==============================================================================
 * ⭐ PHOM SDK — PIPELINE BUILDER
 * Fluent API for constructing, configuring, and executing custom PHOM Boost pipelines.
 * ==============================================================================
 */
import { RealPhomBoostEngine } from '../real/real_boost_engine';
import { PhomEventBus } from './eventBus';
import { PhomPluginRegistry } from './pluginSystem';
import { PhomAgentHooksManager } from './agentHooks';
export class PhomPipelineBuilder {
    options = {
        directive: '/boost',
        autoDistribute: true
    };
    eventBus;
    pluginRegistry;
    hooksManager;
    constructor(eventBus = new PhomEventBus(), pluginRegistry = new PhomPluginRegistry(), hooksManager = new PhomAgentHooksManager()) {
        this.eventBus = eventBus;
        this.pluginRegistry = pluginRegistry;
        this.hooksManager = hooksManager;
    }
    setDirective(directive) {
        this.options.directive = directive;
        return this;
    }
    filterSources(source) {
        this.options.sourceFilter = source;
        return this;
    }
    setMinHeat(band) {
        this.options.minHeatBand = band;
        return this;
    }
    withAutoDistribute(autoDistribute = true) {
        this.options.autoDistribute = autoDistribute;
        return this;
    }
    withDryRun(dryRun = true) {
        if (dryRun) {
            this.options.autoDistribute = false;
        }
        return this;
    }
    usePlugin(plugin) {
        this.pluginRegistry.register(plugin);
        if (plugin.install) {
            plugin.install(this);
        }
        return this;
    }
    on(event, listener) {
        this.eventBus.on(event, listener);
        return this;
    }
    async execute() {
        const boostId = `sdk_boost_${Date.now().toString(36)}`;
        const now = Math.floor(Date.now() / 1000);
        this.eventBus.emit('pipeline:start', {
            boostId,
            directive: this.options.directive || '/boost',
            timestamp: now
        });
        await this.pluginRegistry.runBeforePipeline({
            boostId,
            options: this.options
        });
        try {
            const result = await RealPhomBoostEngine.execute({
                ...this.options,
                boostId
            });
            // Emit events for prospects discovered and posts distributed
            for (const rec of result.pipelineRecords) {
                this.eventBus.emit('signal:ingested', rec.signal);
                this.eventBus.emit('prospect:discovered', rec.prospect);
                this.eventBus.emit('prospect:scored', { prospect: rec.prospect, score: rec.score });
                if (rec.persona) {
                    this.eventBus.emit('persona:synthesized', rec.persona);
                }
                if (rec.distribution) {
                    this.eventBus.emit('post:distributed', rec.distribution);
                }
            }
            await this.pluginRegistry.runAfterPipeline({
                boostId,
                result
            });
            this.eventBus.emit('pipeline:complete', result);
            return result;
        }
        catch (err) {
            this.eventBus.emit('pipeline:error', {
                boostId,
                error: err.message
            });
            throw err;
        }
    }
}
export function createPhomPipeline() {
    return new PhomPipelineBuilder();
}
