/**
 * ==============================================================================
 * ⭐ PHOM SDK — PIPELINE BUILDER
 * Fluent API for constructing, configuring, and executing custom PHOM Boost pipelines.
 * ==============================================================================
 */

import { RealPhomBoostEngine, RealBoostOptions, RealBoostResult } from '../real/real_boost_engine';
import { PhomEventBus } from './eventBus';
import { PhomPluginRegistry } from './pluginSystem';
import { PhomAgentHooksManager } from './agentHooks';
import { PhomPlugin, PhomHeatBand, PhomEventMap } from './types';

export class PhomPipelineBuilder {
  private options: RealBoostOptions = {
    directive: '/boost',
    autoDistribute: true
  };
  private eventBus: PhomEventBus;
  private pluginRegistry: PhomPluginRegistry;
  private hooksManager: PhomAgentHooksManager;

  constructor(
    eventBus: PhomEventBus = new PhomEventBus(),
    pluginRegistry: PhomPluginRegistry = new PhomPluginRegistry(),
    hooksManager: PhomAgentHooksManager = new PhomAgentHooksManager()
  ) {
    this.eventBus = eventBus;
    this.pluginRegistry = pluginRegistry;
    this.hooksManager = hooksManager;
  }

  public setDirective(directive: string): this {
    this.options.directive = directive;
    return this;
  }

  public filterSources(source: string): this {
    this.options.sourceFilter = source;
    return this;
  }

  public setMinHeat(band: PhomHeatBand): this {
    this.options.minHeatBand = band;
    return this;
  }

  public withAutoDistribute(autoDistribute: boolean = true): this {
    this.options.autoDistribute = autoDistribute;
    return this;
  }

  public withDryRun(dryRun: boolean = true): this {
    if (dryRun) {
      this.options.autoDistribute = false;
    }
    return this;
  }

  public usePlugin(plugin: PhomPlugin): this {
    this.pluginRegistry.register(plugin);
    if (plugin.install) {
      plugin.install(this);
    }
    return this;
  }

  public on<K extends keyof PhomEventMap>(event: K, listener: (data: PhomEventMap[K]) => void | Promise<void>): this {
    this.eventBus.on(event, listener);
    return this;
  }

  public async execute(): Promise<RealBoostResult> {
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
    } catch (err: any) {
      this.eventBus.emit('pipeline:error', {
        boostId,
        error: err.message
      });
      throw err;
    }
  }
}

export function createPhomPipeline(): PhomPipelineBuilder {
  return new PhomPipelineBuilder();
}
