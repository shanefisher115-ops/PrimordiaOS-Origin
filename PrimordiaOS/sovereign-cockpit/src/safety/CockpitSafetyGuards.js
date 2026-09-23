/**
 * PrimordiaOS Sovereign Cockpit — Safety Guards Subsystem
 * Enforces command sanitization, destructive mutation blocking,
 * realm rate limiting, and cryptographic license verification.
 */
import { logger } from '../logging/CockpitLogger.js';
export class CockpitSafetyGuards {
    static instance = null;
    realmRateLimits = new Map();
    maxCommandsPerMinute = 120;
    activeLicense;
    // Patterns strictly blocked from execution to maintain sovereign integrity
    lethalPatterns = [
        /rm\s+(-[rRfF]+\s+)*(\/|[a-zA-Z]:\\|\*)/i,
        /del\s+\/s\s+\/q\s+[a-zA-Z]:\\/i,
        /format\s+[a-zA-Z]:/i,
        /drop\s+database/i,
        /drop\s+table\s+users/i,
        /truncate\s+table/i,
        /chmod\s+(-R\s+)?777\s+\//i,
        />\s*\/dev\/sd[a-z]/i,
        /mkfs\./i,
        /dd\s+if=.*of=\/dev\//i,
        /:(){ :\|:& };:/i, // Forkbomb
    ];
    // Patterns that require explicit high-tier authorization
    privilegedPatterns = [
        /docker\s+system\s+prune/i,
        /kill\s+-9/i,
        /taskkill\s+\/F/i,
        /reboot/i,
        /shutdown/i,
        /git\s+reset\s+--hard/i,
        /git\s+clean\s+-fdx/i
    ];
    constructor() {
        this.activeLicense = this.parseLicenseKey(process.env.PRIMORDIAOS_KEY || '');
    }
    static getInstance() {
        if (!CockpitSafetyGuards.instance) {
            CockpitSafetyGuards.instance = new CockpitSafetyGuards();
        }
        return CockpitSafetyGuards.instance;
    }
    /**
     * Evaluates and sanitizes a raw command string before dispatch.
     */
    sanitizeCommand(rawCommand, realm = 'system') {
        const trimmed = rawCommand.trim();
        // 1. Check lethal patterns
        for (const pattern of this.lethalPatterns) {
            if (pattern.test(trimmed)) {
                logger.warn('CockpitSafetyGuards', `Blocked lethal command attempt from realm [${realm}]`, {
                    command: trimmed,
                    pattern: pattern.source
                });
                return {
                    allowed: false,
                    sanitizedCommand: trimmed,
                    reason: `Command matches lethal destructive signature: ${pattern.source}`,
                    riskScore: 100
                };
            }
        }
        // 2. Check privileged patterns against license tier
        for (const pattern of this.privilegedPatterns) {
            if (pattern.test(trimmed)) {
                if (this.activeLicense.tier === 'COMMUNITY') {
                    logger.warn('CockpitSafetyGuards', `Blocked privileged command on Community license`, {
                        command: trimmed,
                        requiredTier: 'PRO_STUDIO'
                    });
                    return {
                        allowed: false,
                        sanitizedCommand: trimmed,
                        reason: `Privileged command requires Pro Studio or Sovereign Enterprise license.`,
                        riskScore: 75
                    };
                }
            }
        }
        // 3. Rate limiting check
        if (!this.checkRateLimit(realm)) {
            logger.warn('CockpitSafetyGuards', `Rate limit exceeded for realm [${realm}]`);
            return {
                allowed: false,
                sanitizedCommand: trimmed,
                reason: `Rate limit exceeded for realm [${realm}]. Max ${this.maxCommandsPerMinute} ops/min.`,
                riskScore: 50
            };
        }
        return {
            allowed: true,
            sanitizedCommand: trimmed,
            riskScore: 0
        };
    }
    /**
     * Verifies that a realm does not exceed rate limits.
     */
    checkRateLimit(realm) {
        const now = Date.now();
        const entry = this.realmRateLimits.get(realm) || { count: 0, windowStart: now };
        if (now - entry.windowStart > 60000) {
            entry.count = 1;
            entry.windowStart = now;
            this.realmRateLimits.set(realm, entry);
            return true;
        }
        if (entry.count >= this.maxCommandsPerMinute) {
            return false;
        }
        entry.count++;
        this.realmRateLimits.set(realm, entry);
        return true;
    }
    /**
     * Validates PrimordiaOS HMAC-SHA256 license format PRIM-[TIER]-[ENTROPY]-[SIG].
     */
    parseLicenseKey(key) {
        const defaultStatus = {
            valid: false,
            tier: 'COMMUNITY',
            entropy: '0000',
            signature: 'UNVERIFIED',
            rawKey: key,
            capabilities: ['basic_telemetry', 'crt_rasterizer', 'holo_panels_standard']
        };
        if (!key || typeof key !== 'string') {
            return defaultStatus;
        }
        const parts = key.trim().split('-');
        if (parts.length < 4 || parts[0] !== 'PRIM') {
            return defaultStatus;
        }
        const tierRaw = parts[1].toUpperCase();
        let tier = 'COMMUNITY';
        const capabilities = ['basic_telemetry', 'crt_rasterizer', 'holo_panels_standard'];
        if (tierRaw === 'PRO' || tierRaw === 'PRO_STUDIO') {
            tier = 'PRO_STUDIO';
            capabilities.push('unreal_bridge_full', 'visioncore_4k', 'neural_theater', 'lut_imperial_gold');
        }
        else if (tierRaw === 'SOVEREIGN' || tierRaw === 'ENTERPRISE' || tierRaw === 'SOVEREIGN_ENTERPRISE') {
            tier = 'SOVEREIGN_ENTERPRISE';
            capabilities.push('unreal_bridge_full', 'visioncore_4k', 'neural_theater', 'lut_imperial_gold', 'lut_cyberpunk_emerald', 'gpu_warp_benchmark', 'unlimited_swarms', 'direct_kernel_dispatch');
        }
        return {
            valid: true,
            tier,
            entropy: parts[2],
            signature: parts.slice(3).join('-'),
            rawKey: key,
            capabilities
        };
    }
    getLicenseStatus() {
        return { ...this.activeLicense };
    }
    hasCapability(capability) {
        return this.activeLicense.capabilities.includes(capability);
    }
}
export const safetyGuards = CockpitSafetyGuards.getInstance();
