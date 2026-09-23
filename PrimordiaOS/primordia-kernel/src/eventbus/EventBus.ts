/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * EventBus.ts - Global event routing, wildcard dispatch, and event quarantine
 */

import { KernelLogger } from '../logging/KernelLogger.js';
import { KernelSafetyLayer } from '../safety/KernelSafetyLayer.js';

export interface KernelEvent<T = unknown> {
  id: string;
  topic: string;
  source: string;
  timestamp: string;
  payload: T;
  traceId?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
}

export type EventHandler<T = unknown> = (event: KernelEvent<T>) => void | Promise<void>;

export interface Subscription {
  id: string;
  topicPattern: string;
  handler: EventHandler;
  sourceFilter?: string;
  priority: number;
}

export class EventBus {
  private logger: KernelLogger;
  private safety: KernelSafetyLayer;
  private subscriptions = new Map<string, Subscription>();
  private eventHistory: KernelEvent[] = [];
  private historyCapacity: number;

  constructor(logger: KernelLogger, safety: KernelSafetyLayer, historyCapacity = 500) {
    this.logger = logger.forSubsystem('eventbus');
    this.safety = safety;
    this.historyCapacity = historyCapacity;
  }

  /**
   * Subscribe to a topic or wildcard pattern.
   * Wildcards: 'realm.*' matches 'realm.boot', 'kernel.**' matches 'kernel.ipc.error'
   */
  public subscribe<T = unknown>(
    topicPattern: string,
    handler: EventHandler<T>,
    options: { sourceFilter?: string; priority?: number } = {}
  ): string {
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const subscription: Subscription = {
      id: subId,
      topicPattern,
      handler: handler as EventHandler,
      sourceFilter: options.sourceFilter,
      priority: options.priority ?? 10,
    };

    this.subscriptions.set(subId, subscription);
    this.logger.debug(`Subscribed [${subId}] to pattern "${topicPattern}"`);
    return subId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    const existed = this.subscriptions.delete(subscriptionId);
    if (existed) {
      this.logger.debug(`Unsubscribed [${subscriptionId}]`);
    }
    return existed;
  }

  /**
   * Publish an event to the global event bus.
   * Enforces safety checks before dispatch; invalid events are quarantined.
   */
  public async emit<T = unknown>(
    topic: string,
    payload: T,
    source = 'kernel',
    options: { traceId?: string; priority?: KernelEvent['priority'] } = {}
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const safetyCheck = this.safety.validateEvent(topic, source, payload);
    if (!safetyCheck.allowed) {
      const quarantineId = this.safety.quarantine(source, safetyCheck.reason || 'Event policy failure', {
        topic,
        payload,
      });
      this.logger.warn(`Event quarantined [${quarantineId}]: ${safetyCheck.reason}`);
      return { success: false, error: safetyCheck.reason };
    }

    const event: KernelEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      topic,
      source,
      timestamp: new Date().toISOString(),
      payload,
      traceId: options.traceId,
      priority: options.priority || 'NORMAL',
    };

    // Store in history
    this.eventHistory.push(event as KernelEvent);
    if (this.eventHistory.length > this.historyCapacity) {
      this.eventHistory.shift();
    }

    this.logger.logEvent(topic, event.id, source, { priority: event.priority });

    // Collect and sort matching subscribers by priority (ascending: lowest number = highest priority)
    const matching = Array.from(this.subscriptions.values())
      .filter(sub => this.matchesPattern(topic, sub.topicPattern))
      .filter(sub => !sub.sourceFilter || sub.sourceFilter === source)
      .sort((a, b) => a.priority - b.priority);

    // Dispatch asynchronously to all handlers
    for (const sub of matching) {
      try {
        const res = sub.handler(event);
        if (res instanceof Promise) {
          res.catch(err => {
            this.logger.error(`Error in async event handler for subscription [${sub.id}] on topic "${topic}"`, err);
          });
        }
      } catch (err) {
        this.logger.error(`Error executing handler for subscription [${sub.id}] on topic "${topic}"`, err);
      }
    }

    return { success: true, eventId: event.id };
  }

  /**
   * Matches topic against wildcard patterns
   * Examples:
   *   'realm.start' matches 'realm.start'
   *   'realm.start' matches 'realm.*'
   *   'kernel.ipc.stream.chunk' matches 'kernel.**'
   */
  private matchesPattern(topic: string, pattern: string): boolean {
    if (pattern === '*' || pattern === '**' || pattern === topic) {
      return true;
    }

    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^.]+')
      .replace(/___DOUBLE_STAR___/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(topic);
  }

  public getHistory(limit = 100, topicFilter?: string): KernelEvent[] {
    let list = this.eventHistory;
    if (topicFilter) {
      list = list.filter(e => this.matchesPattern(e.topic, topicFilter));
    }
    return list.slice(-limit);
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  public clearHistory(): void {
    this.eventHistory.length = 0;
  }
}
