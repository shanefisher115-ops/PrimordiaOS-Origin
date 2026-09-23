/**
 * ==============================================================================
 * ⭐ PHOM SDK — PLUGIN SYSTEM
 * Modular extensibility for enterprise workflows, custom AI models, and CRM integrations.
 * ==============================================================================
 */

import { PhomPlugin } from './types';
import { RealBoostResult } from '../real/real_boost_engine';
import { NormalizedSignal, ExtractedProspect } from '../real/types';

export class PhomPluginRegistry {
  private plugins: Map<string, PhomPlugin> = new Map();

  public register(plugin: PhomPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[PhomPluginRegistry] Overwriting existing plugin: ${plugin.name}`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  public get(name: string): PhomPlugin | undefined {
    return this.plugins.get(name);
  }

  public has(name: string): boolean {
    return this.plugins.has(name);
  }

  public list(): PhomPlugin[] {
    return Array.from(this.plugins.values());
  }

  public unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  public async runBeforePipeline(context: { boostId: string; options: any }): Promise<void> {
    for (const p of this.plugins.values()) {
      if (p.onBeforePipeline) {
        try {
          await p.onBeforePipeline(context);
        } catch (e: any) {
          console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onBeforePipeline:`, e.message);
        }
      }
    }
  }

  public async runAfterPipeline(context: { boostId: string; result: RealBoostResult }): Promise<void> {
    for (const p of this.plugins.values()) {
      if (p.onAfterPipeline) {
        try {
          await p.onAfterPipeline(context);
        } catch (e: any) {
          console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onAfterPipeline:`, e.message);
        }
      }
    }
  }

  public async filterSignal(signal: NormalizedSignal): Promise<NormalizedSignal> {
    let current = signal;
    for (const p of this.plugins.values()) {
      if (p.onSignal) {
        try {
          current = await p.onSignal(current);
        } catch (e: any) {
          console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onSignal:`, e.message);
        }
      }
    }
    return current;
  }

  public async filterProspect(prospect: ExtractedProspect): Promise<ExtractedProspect> {
    let current = prospect;
    for (const p of this.plugins.values()) {
      if (p.onProspect) {
        try {
          current = await p.onProspect(current);
        } catch (e: any) {
          console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onProspect:`, e.message);
        }
      }
    }
    return current;
  }

  public async filterOutbound(text: string, prospect: ExtractedProspect): Promise<string> {
    let current = text;
    for (const p of this.plugins.values()) {
      if (p.onOutbound) {
        try {
          current = await p.onOutbound(current, prospect);
        } catch (e: any) {
          console.warn(`[PhomPluginRegistry] Error in plugin "${p.name}" onOutbound:`, e.message);
        }
      }
    }
    return current;
  }
}

export const defaultPluginRegistry = new PhomPluginRegistry();
