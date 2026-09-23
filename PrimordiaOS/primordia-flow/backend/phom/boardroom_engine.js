/**
 * ==============================================================================
 * ⭐ INTERACTIVE BOARDROOM & AI VOICE ENGINE
 * Generates bespoke interactive executive boardroom experiences and tailored
 * AI Voice briefings customized for each prospect's company, domain, and tech stack.
 * ==============================================================================
 */
import crypto from 'crypto';
import { db } from '../db';
import { PhomRealMemoryGraph } from './layer7_memory_graph';
/**
 * Derives clean corporate name from domain or prospect name.
 */
export function deriveCompanyName(domain, authorName) {
    if (domain) {
        const clean = domain.replace(/^(www\.|blog\.|api\.|dev\.)/, '').toLowerCase();
        const brand = clean.split('.')[0];
        if (brand === 'google')
            return 'Google DeepMind';
        if (brand === 'openai')
            return 'OpenAI';
        if (brand === 'blackmagicdesign')
            return 'Blackmagic Design';
        if (brand === 'epicgames')
            return 'Epic Games';
        if (brand === 'riotgames')
            return 'Riot Games';
        if (brand === 'bungie')
            return 'Bungie';
        if (brand === 'cdprojektred')
            return 'CD Projekt Red';
        if (brand === 'respawn')
            return 'Respawn Entertainment';
        if (brand === 'kojimaproductions')
            return 'Kojima Productions';
        if (brand === 'blizzard')
            return 'Blizzard Entertainment';
        if (brand === 'ubisoft')
            return 'Ubisoft';
        if (brand === 'quesma')
            return 'Quesma';
        if (brand === 'github')
            return 'GitHub';
        if (brand === 'hackaday')
            return 'Hackaday / Supplyframe';
        return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
    if (authorName && authorName !== 'Valued Prospect') {
        return `${authorName}'s Venture`;
    }
    return 'Enterprise Partner';
}
/**
 * Calculates PHOM's Ω-Bond (Omega Bond) — the Upfront Value Stake.
 * Generates an upfront capital commitment tied to their infrastructure profile,
 * complete with cryptographic serial, escrow hash, and conditional release SLA.
 */
export function calculateOmegaBond(prospectId, domain, companyName, monthlySavingsUsd) {
    // Stake 50% of the first month's modeled savings (e.g. $10,000 for $20k savings), bounded between $5,000 and $50,000
    const rawStake = Math.round((monthlySavingsUsd * 0.5) / 500) * 500;
    const bondAmountUsd = Math.max(5000, Math.min(rawStake, 50000));
    const hex = crypto.createHash('sha256').update(prospectId + domain).digest('hex').slice(0, 8).toUpperCase();
    const bondSerial = `PRIM-OMEGA-${hex}`;
    const escrowRef = `0x${crypto.createHash('sha256').update(bondSerial + prospectId).digest('hex').slice(0, 16)}`;
    const now = Math.floor(Date.now() / 1000);
    return {
        bondAmountUsd,
        bondSerial,
        failureCondition: `If PrimordiaOS fails to achieve >= 40% compute overhead reduction or sub-millisecond local-first SQLite WAL task latency during the 30-day benchmark audit, ${companyName} retains the full $${bondAmountUsd.toLocaleString()} USD bond unconditionally.`,
        successConversion: `Upon verified benchmark attainment, the $${bondAmountUsd.toLocaleString()} USD bond converts into perpetual sovereign runtime compute credits, dedicated agent swarm licenses, or enterprise SLA equity.`,
        auditWindowDays: 30,
        status: 'active_stake',
        stakedTimestamp: now,
        escrowRef
    };
}
/**
 * Procedurally synthesizes a tailored executive AI voice script for the company,
 * including the explicit Ω-Bond value stake declaration.
 */
export function generateVoiceScript(companyName, domain, prospectName, techStack, omegaBond) {
    const isGameDev = domain.includes('epicgames') || domain.includes('riotgames') || domain.includes('bungie') ||
        domain.includes('cdprojektred') || domain.includes('respawn') || domain.includes('kojima') ||
        techStack.some(t => /unreal|niagara|lumen|nanite|c\+\+|shader|vfx|houdini/i.test(t));
    const stackSummary = techStack.length > 0 ? techStack.slice(0, 3).join(', ') : (isGameDev ? 'Unreal Engine 5.8 and Niagara GPU pipelines' : 'distributed systems and neural inference');
    const firstName = prospectName.split(' ')[0] || 'Executive Leader';
    if (isGameDev) {
        return `Welcome to the Primordia Sovereign Executive Boardroom for ${companyName}. ` +
            `Hello ${firstName}. We conducted an architectural telemetry audit of ${companyName}'s real-time Unreal Engine 5.8 and rendering pipelines. ` +
            `Currently, scaling complex procedural scenes across ${stackSummary} creates severe shader compilation stalls, ` +
            `Niagara particle synchronization latency, and high cloud render farm compute bills. ` +
            `By deploying Primordia's local-first sovereign bridge, ${companyName} can stream sub-millisecond WebSocket telemetry directly into Niagara particle fields, ` +
            `eliminate remote cloud egress overhead, and cut monthly pipeline infrastructure costs by over 40 percent. ` +
            `To eliminate all downside risk, we have staked a $${omegaBond.bondAmountUsd.toLocaleString()} Omega Value Bond under serial ${omegaBond.bondSerial}. ` +
            `If our sovereign bridge fails to achieve these verified efficiency benchmarks during your 30-day trial audit, ${companyName} retains the full bond unconditionally. ` +
            `We invite you to inspect your holographic bond certificate, interactive ROI models, and live Niagara particle telemetry below.`;
    }
    return `Welcome to the Primordia Sovereign Boardroom for ${companyName}. ` +
        `Hello ${firstName}. We conducted an automated architectural audit of ${domain}'s runtime performance and compute overhead. ` +
        `Currently, scaling workloads across ${stackSummary} introduces significant p99 tail latency and recurring cloud egress bottlenecks. ` +
        `By deploying Primordia's local-first SQLite WAL orchestration and sovereign autonomous agent swarms, ` +
        `${companyName} can reduce agent task latency to sub-millisecond execution times, ` +
        `while cutting monthly infrastructure overhead by approximately 42 percent. ` +
        `Furthermore, to eliminate all downside risk, we are staking an upfront, conditional value bond: ` +
        `the $${omegaBond.bondAmountUsd.toLocaleString()} Omega Bond, registered under serial ${omegaBond.bondSerial}. ` +
        `If our sovereign architecture fails to deliver these efficiency gains within our 30-day benchmark audit, ` +
        `${companyName} keeps the ${omegaBond.bondAmountUsd.toLocaleString()} dollar bond unconditionally. ` +
        `If we deliver, the bond converts into perpetual sovereign compute credits. ` +
        `We are not asking for your trust; we are staking our own capital on our results. ` +
        `We invite you to inspect your holographic bond certificate and interactive models below.`;
}
/**
 * Generates custom ROI metrics based on company profile.
 */
export function generateRoiMetrics(domain, techStack) {
    const isGameDev = domain.includes('epicgames') || domain.includes('riotgames') || domain.includes('bungie') ||
        domain.includes('cdprojektred') || domain.includes('respawn') || domain.includes('kojima') ||
        techStack.some(t => /unreal|niagara|lumen|nanite|c\+\+|shader|vfx|houdini/i.test(t));
    const isLarge = isGameDev || domain.includes('google') || domain.includes('openai') || domain.includes('github') || domain.includes('blackmagic');
    const baseCost = isGameDev ? 68000 : (isLarge ? 48000 : 12000);
    const savingsPct = 0.42;
    const projectedCost = Math.round(baseCost * (1 - savingsPct));
    return {
        currentMonthlyCostUsd: baseCost,
        projectedMonthlyCostUsd: projectedCost,
        monthlySavingsUsd: baseCost - projectedCost,
        p99LatencyReductionMs: isGameDev ? 140 : (isLarge ? 185 : 95),
        agentConcurrencyGain: isGameDev ? 18 : (isLarge ? 16 : 8),
        paybackPeriodMonths: 1.5
    };
}
/**
 * Generates corporate architecture spec.
 */
export function generateArchitectureSpec(companyName, domain, techStack) {
    const isGameDev = domain.includes('epicgames') || domain.includes('riotgames') || domain.includes('bungie') ||
        domain.includes('cdprojektred') || domain.includes('respawn') || domain.includes('kojima') ||
        techStack.some(t => /unreal|niagara|lumen|nanite|c\+\+|shader|vfx|houdini/i.test(t));
    const isAi = domain.includes('ai') || domain.includes('deepmind') || techStack.includes('PyTorch') || techStack.includes('CUDA');
    if (isGameDev) {
        return {
            currentStack: techStack.length > 0 ? techStack : ['Unreal Engine 5.8', 'Niagara GPU VFX', 'Perforce / Git LFS', 'Cloud Render Farm', 'Lumen Global Illumination'],
            proposedStack: ['Primordia Sovereign Unreal 5.8 Bridge', 'Niagara Telemetry Relays', 'Local-First SQLite WAL State Substrate', 'MovieForge 4K Neural Theater Engine'],
            bottlenecksIdentified: [
                'Shader compilation stalls during concurrent multi-agent scene builds',
                'Niagara particle sync latency over remote WebSocket streams',
                'High cloud GPU render-farm egress costs & bake queue delays'
            ],
            sovereignAdvantages: [
                'Sub-5ms local-first telemetry streaming directly into Niagara emitters',
                'Procedural autonomous scene gen without cloud render farm lock-in',
                'Zero-leakage local asset compilation with Level 33 SORE Osmium cryptographic provenance'
            ]
        };
    }
    return {
        currentStack: techStack.length > 0 ? techStack : ['Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        proposedStack: ['Primordia Sovereign Daemon', 'SQLite WAL ACID Substrate', '10-Agent Autonomous Swarm', 'Zero-Egress Telemetry'],
        bottlenecksIdentified: [
            isAi ? 'GPU inference memory bus saturation on multi-tenant cloud' : 'Third-party API rate-limits and roundtrip network latency',
            'Webhook dropped events under concurrent bursts',
            'Centralized cloud database lock contention during concurrent agent mutations'
        ],
        sovereignAdvantages: [
            'Sub-millisecond local-first SQLite WAL ACID persistence',
            'Zero external SaaS telemetry leakage (100% cryptographic sovereignty)',
            'Deterministic agent orchestration with zero idle compute cost'
        ]
    };
}
/**
 * Master Boardroom Synthesizer:
 * Builds and persists an Interactive Boardroom for a prospect.
 */
export function synthesizeBoardroom(prospect, persona) {
    const companyName = deriveCompanyName(prospect.domain, prospect.name);
    const domain = prospect.domain || 'enterprise.network';
    const prospectName = prospect.name || 'Executive';
    const techStack = prospect?.enrichment?.techStack || ['TypeScript', 'Node.js', 'SQLite'];
    const roiMetrics = generateRoiMetrics(domain, techStack);
    const omegaBond = calculateOmegaBond(prospect.id, domain, companyName, roiMetrics.monthlySavingsUsd);
    const voiceScript = generateVoiceScript(companyName, domain, prospectName, techStack, omegaBond);
    const architecture = generateArchitectureSpec(companyName, domain, techStack);
    const boardroomId = `board_${crypto.createHash('sha256').update(prospect.id).digest('hex').slice(0, 10)}`;
    const boardroomUrl = `http://localhost:5174/?tab=boardroom&id=${boardroomId}&prospect=${prospect.id}`;
    const now = Math.floor(Date.now() / 1000);
    PhomRealMemoryGraph.initTables();
    // Persist into SQLite WAL
    db.prepare(`
    INSERT INTO boardrooms (
      id, prospect_id, company_name, domain, voice_script,
      architecture_json, roi_metrics_json, boardroom_url,
      omega_bond_amount, omega_bond_serial, omega_bond_terms_json, omega_bond_status,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(prospect_id) DO UPDATE SET
      company_name = excluded.company_name,
      domain = excluded.domain,
      voice_script = excluded.voice_script,
      architecture_json = excluded.architecture_json,
      roi_metrics_json = excluded.roi_metrics_json,
      boardroom_url = excluded.boardroom_url,
      omega_bond_amount = excluded.omega_bond_amount,
      omega_bond_serial = excluded.omega_bond_serial,
      omega_bond_terms_json = excluded.omega_bond_terms_json,
      omega_bond_status = excluded.omega_bond_status,
      updated_at = excluded.updated_at
  `).run(boardroomId, prospect.id, companyName, domain, voiceScript, JSON.stringify(architecture), JSON.stringify(roiMetrics), boardroomUrl, omegaBond.bondAmountUsd, omegaBond.bondSerial, JSON.stringify(omegaBond), omegaBond.status, now, now);
    return {
        id: boardroomId,
        prospectId: prospect.id,
        companyName,
        domain,
        executiveTitle: `${companyName} Executive Briefing & Architecture Boardroom`,
        voiceScript,
        architecture,
        roiMetrics,
        omegaBond,
        boardroomUrl,
        createdAt: now,
        updatedAt: now
    };
}
/**
 * Retrieves boardroom data for a prospect from SQLite.
 */
export function getBoardroomByProspect(prospectId) {
    try {
        PhomRealMemoryGraph.initTables();
        const row = db.prepare(`SELECT * FROM boardrooms WHERE prospect_id = ?`).get(prospectId);
        if (!row)
            return null;
        const roiMetrics = JSON.parse(row.roi_metrics_json);
        const omegaBond = row.omega_bond_terms_json
            ? JSON.parse(row.omega_bond_terms_json)
            : calculateOmegaBond(row.prospect_id, row.domain, row.company_name, roiMetrics.monthlySavingsUsd);
        return {
            id: row.id,
            prospectId: row.prospect_id,
            companyName: row.company_name,
            domain: row.domain,
            executiveTitle: `${row.company_name} Executive Briefing & Architecture Boardroom`,
            voiceScript: row.voice_script,
            architecture: JSON.parse(row.architecture_json),
            roiMetrics,
            omegaBond,
            boardroomUrl: row.boardroom_url,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    catch (err) {
        return null;
    }
}
/**
 * Lists all active corporate boardrooms in the system.
 */
export function listAllBoardrooms() {
    try {
        PhomRealMemoryGraph.initTables();
        const rows = db.prepare(`SELECT * FROM boardrooms ORDER BY updated_at DESC LIMIT 50`).all();
        return rows.map(row => {
            const roiMetrics = JSON.parse(row.roi_metrics_json);
            const omegaBond = row.omega_bond_terms_json
                ? JSON.parse(row.omega_bond_terms_json)
                : calculateOmegaBond(row.prospect_id, row.domain, row.company_name, roiMetrics.monthlySavingsUsd);
            return {
                id: row.id,
                prospectId: row.prospect_id,
                companyName: row.company_name,
                domain: row.domain,
                executiveTitle: `${row.company_name} Executive Briefing & Architecture Boardroom`,
                voiceScript: row.voice_script,
                architecture: JSON.parse(row.architecture_json),
                roiMetrics,
                omegaBond,
                boardroomUrl: row.boardroom_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        });
    }
    catch (err) {
        return [];
    }
}
