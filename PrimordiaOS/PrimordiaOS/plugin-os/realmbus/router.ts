// ============================================================
//   REALMBUS ROUTER — Intent-Based Message Routing
// ============================================================
//
//   Routes messages to the correct realm based on:
//     1. Explicit target field
//     2. Intent namespace matching (via RealmRegistry)
//     3. Broadcast fan-out for target='*'
//
//   Also enforces safety policies before routing.
//

import type { RealmMessage, KillSwitchState } from './protocol.js';
import { KillSwitchLevel, createResponse, BROADCAST_TARGET } from './protocol.js';
import { RealmRegistry } from './registry.js';

// ─── Safety Policy ──────────────────────────────────────────

export interface RealmPolicy {
  /** Intents blocked globally (like SAFE_MODE_BLOCKED in purlSafety) */
  blockedIntents: Set<string>;

  /** Per-realm permission restrictions */
  realmPermissions: Map<string, {
    canCommand: string[];
    canSubscribe: string[];
    maxConcurrentAgents: number;
    rateLimitPerMinute: number;
  }>;

  /** Intents requiring operator confirmation */
  requireConfirmation: Set<string>;
}

// ─── Default Policy ─────────────────────────────────────────

export function createDefaultPolicy(): RealmPolicy {
  return {
    blockedIntents: new Set([
      'system.destroy',
      'system.wipe',
      'kernel.override',
      'kernel.replace',
      'world.reset',
      'world.destroy',
      'agent.killAll',
      'agent.purge',
      'cloud.nuke',
    ]),
    realmPermissions: new Map(),
    requireConfirmation: new Set([
      'agent.killAll',
      'swarm.kill',
      'system.shutdown',
    ]),
  };
}

// ─── Routing Result ─────────────────────────────────────────

export interface RouteResult {
  allowed: boolean;
  targetRealms: string[];
  violations: string[];
  requiresConfirmation: boolean;
}

// ─── Router Class ───────────────────────────────────────────

export class RealmRouter {
  private policy: RealmPolicy;
  private killSwitch: KillSwitchState;

  constructor(
    private registry: RealmRegistry,
    policy?: RealmPolicy
  ) {
    this.policy = policy ?? createDefaultPolicy();
    this.killSwitch = {
      level: KillSwitchLevel.NONE,
      activatedAt: null,
      activatedBy: null,
      reason: null,
      affectedRealms: [],
      affectedAgents: [],
    };
  }

  // ── Route a Message ─────────────────────────────────────

  route(message: RealmMessage): RouteResult {
    const violations: string[] = [];

    // ── Kill Switch Enforcement ─────────────────────────────
    if (this.killSwitch.level >= KillSwitchLevel.EMERGENCY_HALT) {
      return {
        allowed: false,
        targetRealms: [],
        violations: ['EMERGENCY_HALT: All routing suspended'],
        requiresConfirmation: false,
      };
    }

    if (this.killSwitch.level >= KillSwitchLevel.SAFE_MODE) {
      if (message.type === 'command' && this.isDestructiveIntent(message.intent)) {
        return {
          allowed: false,
          targetRealms: [],
          violations: [`SAFE_MODE: Destructive intent "${message.intent}" blocked`],
          requiresConfirmation: false,
        };
      }
    }

    if (this.killSwitch.level >= KillSwitchLevel.REALM) {
      if (this.killSwitch.affectedRealms.includes(message.target)) {
        return {
          allowed: false,
          targetRealms: [],
          violations: [`REALM_DISCONNECT: Realm "${message.target}" is disconnected by kill switch`],
          requiresConfirmation: false,
        };
      }
    }

    // ── Policy Enforcement ──────────────────────────────────

    // Check blocked intents
    if (this.policy.blockedIntents.has(message.intent)) {
      violations.push(
        `POLICY: Intent "${message.intent}" is globally blocked`
      );
    }

    // Check per-realm permissions
    const sourcePerms = this.policy.realmPermissions.get(message.source);
    if (sourcePerms && message.target !== BROADCAST_TARGET) {
      if (!sourcePerms.canCommand.includes(message.target) && !sourcePerms.canCommand.includes('*')) {
        violations.push(
          `POLICY: Realm "${message.source}" is not permitted to command realm "${message.target}"`
        );
      }
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        targetRealms: [],
        violations,
        requiresConfirmation: false,
      };
    }

    // ── Resolve Target Realms ───────────────────────────────

    const targetRealms: string[] = [];

    if (message.target === BROADCAST_TARGET) {
      // Broadcast: all realms except source
      targetRealms.push(
        ...this.registry.getRealmNames().filter((r) => r !== message.source)
      );
    } else if (this.registry.has(message.target)) {
      // Explicit target: direct route
      targetRealms.push(message.target);
    } else {
      // Implicit target: resolve from intent namespace
      const realm = this.registry.findRealmForIntent(message.intent);
      if (realm) {
        targetRealms.push(realm.realmName);
      } else {
        violations.push(
          `ROUTING: No realm found for target "${message.target}" or intent "${message.intent}"`
        );
      }
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        targetRealms: [],
        violations,
        requiresConfirmation: false,
      };
    }

    // ── Confirmation Check ──────────────────────────────────

    const requiresConfirmation = this.policy.requireConfirmation.has(message.intent);

    return {
      allowed: true,
      targetRealms,
      violations: [],
      requiresConfirmation,
    };
  }

  // ── Kill Switch Control ─────────────────────────────────

  activateKillSwitch(
    level: KillSwitchLevel,
    activatedBy: string,
    reason: string,
    options?: { affectedRealms?: string[]; affectedAgents?: string[] }
  ): KillSwitchState {
    this.killSwitch = {
      level,
      activatedAt: Date.now(),
      activatedBy,
      reason,
      affectedRealms: options?.affectedRealms ?? [],
      affectedAgents: options?.affectedAgents ?? [],
    };

    return { ...this.killSwitch };
  }

  deactivateKillSwitch(): KillSwitchState {
    this.killSwitch = {
      level: KillSwitchLevel.NONE,
      activatedAt: null,
      activatedBy: null,
      reason: null,
      affectedRealms: [],
      affectedAgents: [],
    };

    return { ...this.killSwitch };
  }

  getKillSwitchState(): Readonly<KillSwitchState> {
    return { ...this.killSwitch };
  }

  // ── Policy Management ───────────────────────────────────

  blockIntent(intent: string): void {
    this.policy.blockedIntents.add(intent);
  }

  unblockIntent(intent: string): void {
    this.policy.blockedIntents.delete(intent);
  }

  getBlockedIntents(): string[] {
    return Array.from(this.policy.blockedIntents);
  }

  // ── Internal ────────────────────────────────────────────

  private isDestructiveIntent(intent: string): boolean {
    const destructivePatterns = [
      'destroy', 'delete', 'wipe', 'nuke', 'purge',
      'killAll', 'reset', 'override', 'replace',
    ];
    const lower = intent.toLowerCase();
    return destructivePatterns.some((p) => lower.includes(p));
  }
}
