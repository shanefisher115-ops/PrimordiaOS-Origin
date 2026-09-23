/**
 * ==============================================================================
 * ⭐ PHOM SDK — AGENT LIFECYCLE HOOKS
 * Inspect, intercept, and augment agent execution flows:
 * - beforeRun: Intercept input before agent processes
 * - afterRun: Transform output or record telemetry
 * - onError: Graceful fallback or error tracking
 * - onStateChange: Observability into state transitions
 * ==============================================================================
 */

import { AgentHookContext } from './types';

export type BeforeRunHook = (context: AgentHookContext) => Promise<void> | void;
export type AfterRunHook = (context: AgentHookContext & { durationMs: number }) => Promise<void> | void;
export type OnErrorHook = (context: AgentHookContext & { error: Error }) => Promise<void> | void;
export type OnStateChangeHook = (agentName: string, fromState: string, toState: string, meta?: any) => Promise<void> | void;

export interface AgentHooks {
  beforeRun?: BeforeRunHook[];
  afterRun?: AfterRunHook[];
  onError?: OnErrorHook[];
  onStateChange?: OnStateChangeHook[];
}

export class PhomAgentHooksManager {
  private globalHooks: AgentHooks = {
    beforeRun: [],
    afterRun: [],
    onError: [],
    onStateChange: []
  };

  private agentSpecificHooks: Map<string, AgentHooks> = new Map();

  public registerBeforeRun(agentName: string | 'all', hook: BeforeRunHook): void {
    if (agentName === 'all') {
      this.globalHooks.beforeRun!.push(hook);
    } else {
      const hooks = this.getOrCreateAgentHooks(agentName);
      hooks.beforeRun!.push(hook);
    }
  }

  public registerAfterRun(agentName: string | 'all', hook: AfterRunHook): void {
    if (agentName === 'all') {
      this.globalHooks.afterRun!.push(hook);
    } else {
      const hooks = this.getOrCreateAgentHooks(agentName);
      hooks.afterRun!.push(hook);
    }
  }

  public registerOnError(agentName: string | 'all', hook: OnErrorHook): void {
    if (agentName === 'all') {
      this.globalHooks.onError!.push(hook);
    } else {
      const hooks = this.getOrCreateAgentHooks(agentName);
      hooks.onError!.push(hook);
    }
  }

  public registerOnStateChange(hook: OnStateChangeHook): void {
    this.globalHooks.onStateChange!.push(hook);
  }

  public async triggerBeforeRun(context: AgentHookContext): Promise<void> {
    const list = [...(this.globalHooks.beforeRun || [])];
    const specific = this.agentSpecificHooks.get(context.agentName)?.beforeRun;
    if (specific) list.push(...specific);

    for (const hook of list) {
      try {
        await hook(context);
      } catch (e: any) {
        console.warn(`[PhomAgentHooks] Error in beforeRun for ${context.agentName}:`, e.message);
      }
    }
  }

  public async triggerAfterRun(context: AgentHookContext & { durationMs: number }): Promise<void> {
    const list = [...(this.globalHooks.afterRun || [])];
    const specific = this.agentSpecificHooks.get(context.agentName)?.afterRun;
    if (specific) list.push(...specific);

    for (const hook of list) {
      try {
        await hook(context);
      } catch (e: any) {
        console.warn(`[PhomAgentHooks] Error in afterRun for ${context.agentName}:`, e.message);
      }
    }
  }

  public async triggerOnError(context: AgentHookContext & { error: Error }): Promise<void> {
    const list = [...(this.globalHooks.onError || [])];
    const specific = this.agentSpecificHooks.get(context.agentName)?.onError;
    if (specific) list.push(...specific);

    for (const hook of list) {
      try {
        await hook(context);
      } catch (e: any) {
        console.warn(`[PhomAgentHooks] Error in onError for ${context.agentName}:`, e.message);
      }
    }
  }

  public async triggerOnStateChange(agentName: string, fromState: string, toState: string, meta?: any): Promise<void> {
    for (const hook of this.globalHooks.onStateChange || []) {
      try {
        await hook(agentName, fromState, toState, meta);
      } catch (e: any) {
        console.warn(`[PhomAgentHooks] Error in onStateChange for ${agentName}:`, e.message);
      }
    }
  }

  private getOrCreateAgentHooks(name: string): AgentHooks {
    if (!this.agentSpecificHooks.has(name)) {
      this.agentSpecificHooks.set(name, {
        beforeRun: [],
        afterRun: [],
        onError: [],
        onStateChange: []
      });
    }
    return this.agentSpecificHooks.get(name)!;
  }
}

export const defaultAgentHooks = new PhomAgentHooksManager();
