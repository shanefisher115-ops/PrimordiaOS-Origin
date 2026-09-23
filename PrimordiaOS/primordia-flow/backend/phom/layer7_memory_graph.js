/**
 * ==============================================================================
 * ⭐ LAYER 7: MEMORY GRAPH
 * Complete SQLite schema and graph persistence:
 * - Tables for prospects, signals, personas, outbound, analytics
 * - Tables for nodes and edges
 * - No fictional brainstem
 * - No Solfeggio frequencies
 *
 * Deliverable:
 * CREATE TABLE prospects (...);
 * CREATE TABLE signals (...);
 * CREATE TABLE personas (...);
 * CREATE TABLE outbound (...);
 * CREATE TABLE analytics (...);
 * ==============================================================================
 */
import crypto from 'crypto';
import { db } from '../db';
export class PhomRealMemoryGraph {
    /**
     * Initializes all required SQLite tables for the sovereign memory substrate.
     */
    static initTables() {
        db.exec(`
      -- 1. Prospects Table
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        domain TEXT,
        heat INTEGER DEFAULT 0,
        band TEXT DEFAULT 'cold',
        mx_verified INTEGER DEFAULT 0,
        mx_records TEXT,
        confidence_score REAL DEFAULT 85,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
      CREATE INDEX IF NOT EXISTS idx_prospects_domain ON prospects(domain);
      CREATE INDEX IF NOT EXISTS idx_prospects_band ON prospects(band);

      -- 2. Signals Table
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        timestamp INTEGER NOT NULL,
        prospect_id TEXT,
        raw_json TEXT,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
      CREATE INDEX IF NOT EXISTS idx_signals_prospect ON signals(prospect_id);

      -- 3. Personas Table
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        prospect_id TEXT UNIQUE NOT NULL,
        tone TEXT NOT NULL,
        interests TEXT NOT NULL,
        preferred_platform TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_personas_prospect ON personas(prospect_id);

      -- 4. Outbound Table
      CREATE TABLE IF NOT EXISTS outbound (
        id TEXT PRIMARY KEY,
        prospect_id TEXT,
        persona_id TEXT,
        platform TEXT NOT NULL,
        text TEXT NOT NULL,
        variants_json TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        sent_at INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_outbound_status ON outbound(status);
      CREATE INDEX IF NOT EXISTS idx_outbound_prospect ON outbound(prospect_id);

      -- 5. Analytics Table
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'social',
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        replies INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        metrics_json TEXT,
        recorded_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_post ON analytics(post_id);

      -- 6. Graph Nodes Table
      CREATE TABLE IF NOT EXISTS phom_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        properties_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON phom_nodes(type);

      -- 7. Graph Edges Table
      CREATE TABLE IF NOT EXISTS phom_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        properties_json TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_id) REFERENCES phom_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES phom_nodes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_edges_source ON phom_edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON phom_edges(target_id);
      -- 8. Interactive Boardrooms Table
      CREATE TABLE IF NOT EXISTS boardrooms (
        id TEXT PRIMARY KEY,
        prospect_id TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        domain TEXT NOT NULL,
        voice_script TEXT NOT NULL,
        architecture_json TEXT NOT NULL,
        roi_metrics_json TEXT NOT NULL,
        boardroom_url TEXT NOT NULL,
        omega_bond_amount REAL DEFAULT 0,
        omega_bond_serial TEXT,
        omega_bond_terms_json TEXT,
        omega_bond_status TEXT DEFAULT 'active_stake',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_boardrooms_prospect ON boardrooms(prospect_id);

      -- 9. Email Dispatches Table
      CREATE TABLE IF NOT EXISTS email_dispatches (
        id TEXT PRIMARY KEY,
        prospect_id TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_body TEXT NOT NULL,
        text_body TEXT NOT NULL,
        boardroom_url TEXT NOT NULL,
        status TEXT NOT NULL,
        transport TEXT NOT NULL,
        message_id TEXT,
        error TEXT,
        sent_at INTEGER NOT NULL,
        opened_at INTEGER,
        last_opened_at INTEGER,
        open_count INTEGER DEFAULT 0,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_email_prospect ON email_dispatches(prospect_id);

      -- 10. Evolution Ledger Table
      CREATE TABLE IF NOT EXISTS evolution_ledger (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        details TEXT NOT NULL,
        artifact_hash TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON evolution_ledger(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ledger_event_type ON evolution_ledger(event_type);

      -- 11. Inbound Email Responses Table
      CREATE TABLE IF NOT EXISTS email_responses (
        id TEXT PRIMARY KEY,
        dispatch_id TEXT,
        prospect_id TEXT,
        from_email TEXT NOT NULL,
        from_name TEXT,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_text TEXT NOT NULL,
        body_html TEXT,
        intent TEXT NOT NULL DEFAULT 'interested',
        sentiment TEXT NOT NULL DEFAULT 'positive',
        sentiment_score REAL DEFAULT 0.8,
        suggested_reply TEXT,
        status TEXT NOT NULL DEFAULT 'unread',
        received_at INTEGER NOT NULL,
        message_id TEXT,
        raw_payload_json TEXT,
        FOREIGN KEY (dispatch_id) REFERENCES email_dispatches(id) ON DELETE SET NULL,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_responses_dispatch ON email_responses(dispatch_id);
      CREATE INDEX IF NOT EXISTS idx_responses_prospect ON email_responses(prospect_id);
      CREATE INDEX IF NOT EXISTS idx_responses_status ON email_responses(status);
      CREATE INDEX IF NOT EXISTS idx_responses_received_at ON email_responses(received_at);
    `);
        // Safe migration for existing SQLite database files
        try {
            db.exec('ALTER TABLE prospects ADD COLUMN mx_verified INTEGER DEFAULT 0;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE prospects ADD COLUMN mx_records TEXT;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE prospects ADD COLUMN confidence_score REAL DEFAULT 85;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE boardrooms ADD COLUMN omega_bond_amount REAL DEFAULT 0;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE boardrooms ADD COLUMN omega_bond_serial TEXT;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE boardrooms ADD COLUMN omega_bond_terms_json TEXT;');
        }
        catch (e) { }
        try {
            db.exec("ALTER TABLE boardrooms ADD COLUMN omega_bond_status TEXT DEFAULT 'active_stake';");
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE email_dispatches ADD COLUMN opened_at INTEGER;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE email_dispatches ADD COLUMN last_opened_at INTEGER;');
        }
        catch (e) { }
        try {
            db.exec('ALTER TABLE email_dispatches ADD COLUMN open_count INTEGER DEFAULT 0;');
        }
        catch (e) { }
    }
    // ── High-Level Entity Helpers ───────────────────────────────────────────────
    static upsertProspect(data) {
        this.initTables();
        const now = Math.floor(Date.now() / 1000);
        const email = data.email || null;
        let id = data.id;
        if (!id && email) {
            const existing = db.prepare('SELECT id FROM prospects WHERE email = ?').get(email);
            if (existing)
                id = existing.id;
        }
        else if (email) {
            const existing = db.prepare('SELECT id FROM prospects WHERE email = ?').get(email);
            if (existing && existing.id !== id) {
                id = existing.id; // Map to existing record to respect UNIQUE email constraint
            }
        }
        if (!id)
            id = `prosp_${crypto.randomUUID().slice(0, 10)}`;
        const name = data.name || 'Valued Prospect';
        const domain = data.domain || null;
        const heat = data.heat !== undefined ? data.heat : 0;
        const band = data.band || 'cold';
        const mxVerified = data.mxVerified !== undefined ? (data.mxVerified ? 1 : 0) : null;
        const mxRecords = data.mxRecords !== undefined ? data.mxRecords : null;
        const confidenceScore = data.confidenceScore !== undefined ? data.confidenceScore : (data.mxVerified ? 95 : 60);
        db.prepare(`
      INSERT INTO prospects (id, email, name, domain, heat, band, mx_verified, mx_records, confidence_score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 0), ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = COALESCE(excluded.name, prospects.name),
        domain = COALESCE(excluded.domain, prospects.domain),
        heat = excluded.heat,
        band = excluded.band,
        mx_verified = CASE WHEN ? IS NOT NULL THEN ? ELSE prospects.mx_verified END,
        mx_records = COALESCE(?, prospects.mx_records),
        confidence_score = COALESCE(excluded.confidence_score, prospects.confidence_score),
        updated_at = excluded.updated_at
    `).run(id, email, name, domain, heat, band, mxVerified, mxRecords, confidenceScore, now, now, mxVerified, mxVerified, mxRecords);
        // Sync to graph node
        this.addNode(id, 'prospect', name, { email, domain, heat, band, mxVerified: Boolean(mxVerified), mxRecords, confidenceScore });
        return { id, email, name, domain, heat, band, mxVerified: Boolean(mxVerified), mxRecords: mxRecords || undefined, confidenceScore };
    }
    static insertSignal(signal, prospectId) {
        this.initTables();
        const id = signal.id || `sig_${crypto.randomUUID().slice(0, 10)}`;
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`
      INSERT OR REPLACE INTO signals (id, source, author, content, url, timestamp, prospect_id, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, signal.source, signal.author, signal.content, signal.url, signal.timestamp, prospectId || null, JSON.stringify(signal));
        // Sync to graph node
        this.addNode(id, 'signal', `${signal.source} from ${signal.author}`, { url: signal.url, timestamp: signal.timestamp });
        if (prospectId) {
            this.addEdge(prospectId, id, 'emitted_signal', 1.0);
        }
        return id;
    }
    static upsertPersona(persona) {
        this.initTables();
        const now = Math.floor(Date.now() / 1000);
        const id = persona.id || `pers_${crypto.randomUUID().slice(0, 10)}`;
        const prospectId = persona.prospectId || id;
        db.prepare(`
      INSERT INTO personas (id, prospect_id, tone, interests, preferred_platform, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(prospect_id) DO UPDATE SET
        tone = excluded.tone,
        interests = excluded.interests,
        preferred_platform = excluded.preferred_platform,
        updated_at = excluded.updated_at
    `).run(id, prospectId, persona.tone, JSON.stringify(persona.interests), persona.preferredPlatform, now, now);
        // Sync to graph node and link
        this.addNode(id, 'persona', `${persona.tone} Persona`, { interests: persona.interests, platform: persona.preferredPlatform });
        this.addEdge(prospectId, id, 'has_persona', 1.0);
    }
    static insertOutbound(outbound) {
        this.initTables();
        const id = outbound.id || `out_${crypto.randomUUID().slice(0, 10)}`;
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`
      INSERT OR REPLACE INTO outbound (id, prospect_id, persona_id, platform, text, variants_json, status, sent_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, outbound.prospectId || null, outbound.personaId || null, outbound.platform, outbound.text, JSON.stringify(outbound.variants || []), outbound.status || 'draft', outbound.sentAt || null, now);
        // Sync to graph node and link
        this.addNode(id, 'outbound', `Outbound for ${outbound.platform}`, { platform: outbound.platform, status: outbound.status });
        if (outbound.prospectId) {
            this.addEdge(outbound.prospectId, id, 'targeted_by_outbound', 1.0);
        }
        return id;
    }
    // ── Graph Primitives ────────────────────────────────────────────────────────
    static addNode(id, type, label, properties = {}) {
        this.initTables();
        const now = Math.floor(Date.now() / 1000);
        const propsJson = JSON.stringify(properties);
        db.prepare(`
      INSERT INTO phom_nodes (id, type, label, properties_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        properties_json = excluded.properties_json
    `).run(id, type, label, propsJson, now);
        return { id, type, label, properties_json: propsJson, created_at: now };
    }
    static addEdge(sourceId, targetId, relationship, weight = 1.0, properties = {}) {
        this.initTables();
        const edgeId = `edge_${crypto.createHash('sha256').update(`${sourceId}:${targetId}:${relationship}`).digest('hex').slice(0, 10)}`;
        const now = Math.floor(Date.now() / 1000);
        const propsJson = JSON.stringify(properties);
        // Ensure source and target nodes exist in phom_nodes to satisfy SQLite foreign keys
        db.prepare(`
      INSERT INTO phom_nodes (id, type, label, properties_json, created_at)
      VALUES (?, 'entity', ?, '{}', ?)
      ON CONFLICT(id) DO NOTHING
    `).run(sourceId, sourceId, now);
        db.prepare(`
      INSERT INTO phom_nodes (id, type, label, properties_json, created_at)
      VALUES (?, 'entity', ?, '{}', ?)
      ON CONFLICT(id) DO NOTHING
    `).run(targetId, targetId, now);
        db.prepare(`
      INSERT INTO phom_edges (id, source_id, target_id, relationship, weight, properties_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        weight = excluded.weight,
        properties_json = excluded.properties_json
    `).run(edgeId, sourceId, targetId, relationship, weight, propsJson, now);
        return { id: edgeId, source_id: sourceId, target_id: targetId, relationship, weight, properties_json: propsJson, created_at: now };
    }
    // ── Specific Node & Edge Generators for Missing Matrix Items ───────────────
    static addOutboundNode(id, outbound) {
        return this.addNode(id, 'outbound', `Outbound Message (${outbound.platform})`, {
            platform: outbound.platform,
            textPreview: outbound.text.slice(0, 100),
            variantsCount: outbound.variants?.length || 1,
            status: outbound.status || 'draft'
        });
    }
    static addAnalyticsNode(id, analytics) {
        return this.addNode(id, 'analytics', `Analytics (${analytics.platform || 'social'})`, {
            clicks: analytics.clicks || 0,
            impressions: analytics.impressions || 0,
            replies: analytics.replies || 0,
            conversions: analytics.conversions || 0,
            platform: analytics.platform || 'social'
        });
    }
    static addPersonaNode(id, persona) {
        return this.addNode(id, 'persona', `${persona.tone} Persona`, {
            tone: persona.tone,
            interests: persona.interests,
            platform: persona.platform
        });
    }
    static addOutboundEdge(prospectId, outboundId, relationship = 'targeted_by_outbound') {
        return this.addEdge(prospectId, outboundId, relationship, 1.0);
    }
    static addAnalyticsEdge(outboundId, analyticsId, relationship = 'tracked_by_analytics') {
        return this.addEdge(outboundId, analyticsId, relationship, 1.0);
    }
    static addPersonaEdge(prospectId, personaId, relationship = 'modeled_by_persona') {
        return this.addEdge(prospectId, personaId, relationship, 1.0);
    }
    /**
     * Registers all 10 autonomous PHOM swarm agents into the memory graph.
     */
    static ensureAllAgentNodes() {
        const agents = [
            { id: 'agent_discovery_agent', label: 'Discovery Agent', realm: 'Realm of Primordia Intake', hz: '432 Hz' },
            { id: 'agent_scoring_agent', label: 'Scoring Agent', realm: 'Realm of Orbit Dynamics', hz: '639 Hz' },
            { id: 'agent_persona_agent', label: 'Persona Agent', realm: 'Realm of Cognitive Synthesis', hz: '741 Hz' },
            { id: 'agent_outbound_agent', label: 'Outbound Agent', realm: 'Realm of Narrative Forge', hz: '852 Hz' },
            { id: 'agent_distributor_agent', label: 'Distributor Agent', realm: 'Realm of Viral Cascade', hz: '963 Hz' },
            { id: 'agent_analytics_agent', label: 'Analytics Agent', realm: 'Realm of Telemetry Core', hz: '741 Hz' },
            { id: 'agent_orchestrator_agent', label: 'Orchestrator Agent', realm: 'Realm of Sovereignty Orchestration', hz: '528 Hz' },
            { id: 'agent_memory_agent', label: 'Memory Agent', realm: 'Realm of Neural CRM Cortex', hz: '1111 Hz' },
            { id: 'agent_heat_drift_agent', label: 'Heat Drift Agent', realm: 'Realm of Decay Calibration', hz: '639 Hz' },
            { id: 'agent_persona_evolution_agent', label: 'Persona Evolution Agent', realm: 'Realm of Adaptive Synthesis', hz: '741 Hz' }
        ];
        for (const a of agents) {
            this.addNode(a.id, 'Agent', a.label, {
                realm: a.realm,
                harmonic_hz: a.hz,
                status: 'active'
            });
        }
    }
    /**
     * Creates agent → agent edges representing swarm communication and task delegation.
     */
    static linkAgentSwarmEdges() {
        this.ensureAllAgentNodes();
        const edges = [];
        // Swarm execution sequence:
        // Discovery -> Scoring -> Persona -> Outbound -> Distributor -> Analytics -> HeatDrift / PersonaEvolution
        const sequence = [
            ['agent_discovery_agent', 'agent_scoring_agent', 'delegates_lead_to'],
            ['agent_scoring_agent', 'agent_persona_agent', 'delegates_score_to'],
            ['agent_persona_agent', 'agent_outbound_agent', 'delegates_persona_to'],
            ['agent_outbound_agent', 'agent_distributor_agent', 'delegates_message_to'],
            ['agent_distributor_agent', 'agent_analytics_agent', 'delegates_post_to'],
            ['agent_analytics_agent', 'agent_heat_drift_agent', 'delegates_telemetry_to'],
            ['agent_analytics_agent', 'agent_persona_evolution_agent', 'delegates_conversion_to'],
            ['agent_orchestrator_agent', 'agent_discovery_agent', 'coordinates_lifecycle'],
            ['agent_orchestrator_agent', 'agent_memory_agent', 'synchronizes_memory'],
            ['agent_memory_agent', 'agent_orchestrator_agent', 'provides_graph_state']
        ];
        for (const [src, tgt, rel] of sequence) {
            edges.push(this.addEdge(src, tgt, rel, 1.0, { swarmChannel: 'sovereign_mesh' }));
        }
        return edges;
    }
    static getGraphStats() {
        this.initTables();
        try {
            const nodeRow = db.prepare(`SELECT COUNT(*) as count FROM phom_nodes`).get();
            const edgeRow = db.prepare(`SELECT COUNT(*) as count FROM phom_edges`).get();
            const prospRow = db.prepare(`SELECT COUNT(*) as count FROM prospects`).get();
            const sigRow = db.prepare(`SELECT COUNT(*) as count FROM signals`).get();
            return {
                nodesCount: nodeRow?.count || 0,
                edgesCount: edgeRow?.count || 0,
                prospectsCount: prospRow?.count || 0,
                signalsCount: sigRow?.count || 0
            };
        }
        catch {
            return { nodesCount: 0, edgesCount: 0, prospectsCount: 0, signalsCount: 0 };
        }
    }
}
