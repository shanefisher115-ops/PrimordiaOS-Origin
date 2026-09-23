// modules/automation/automation-loop.ts
import * as fs from 'fs';
import * as path from 'path';
export class AutomationLoop {
    configPath;
    schemaPath;
    config;
    metrics = {};
    activeSignals = {};
    selectedActions = [];
    eventHistory = [];
    score = 0;
    clientCallback;
    constructor(configPath = path.resolve(process.cwd(), 'primordiaos_automation.json'), schemaPath = path.resolve(process.cwd(), 'primordia_event_schema.json')) {
        this.configPath = configPath;
        this.schemaPath = schemaPath;
        this.loadConfig();
        this.initDefaultMetrics();
    }
    setClientCallback(callback) {
        this.clientCallback = callback;
    }
    loadConfig() {
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(data);
            console.log(`[AutomationLoop] Loaded configuration for ${this.config.system} (v${this.config.version})`);
        }
        catch (err) {
            console.error('[AutomationLoop] Failed to load config, using default stub structure:', err.message);
            // Stub config in case file load fails
            this.config = {
                version: "1.0.0",
                system: "PrimordiaOS",
                automation_level: "full",
                signals: { sources: [], definitions: [] },
                actions: { library: [], policies: [] },
                worlds: { templates: [] },
                loop: { steps: [], event_endpoint: "", event_schema_ref: "" }
            };
        }
    }
    initDefaultMetrics() {
        this.metrics = {
            agent_energy: 0.88,
            metric_stream_variance: 0.35,
            unreal_bridge: "online",
            agent_focus: 0.75,
            agent_clarity: 0.9,
            evolution_depth: 5,
            evolution_magnitude: 1.5,
            evolution_phase: 0.45,
            signal_severity: "high"
        };
    }
    /**
     * Safe parser for expressions like "agent_energy > 0.7 && metric_stream_variance > 0.3"
     */
    evaluateExpression(expression, context) {
        let expr = expression;
        for (const [key, val] of Object.entries(context)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            expr = expr.replace(regex, typeof val === 'string' ? `"${val}"` : String(val));
        }
        try {
            if (/^[a-zA-Z0-9_.\s><=!&|'"()\-+*/]+$/.test(expr)) {
                return Function(`"use strict"; return (${expr})`)();
            }
        }
        catch (err) {
            console.error(`[AutomationLoop] Expression evaluation error for "${expression}":`, err.message);
        }
        return false;
    }
    /**
     * Step 1: Collect Metrics
     */
    collect_metrics() {
        console.log('[Loop Step] 1/7 - Collecting Metrics...');
        const rootDir = path.resolve(__dirname, '../..');
        const filesToRead = [
            { name: 'AGENT_STATE.txt', key: 'agent_state' },
            { name: 'METRIC_UPDATE.txt', key: 'metric_update' },
            { name: 'PULSE_UPDATE.txt', key: 'pulse_update' },
            { name: 'EVOLUTION_PATCH.txt', key: 'evolution_patch' }
        ];
        for (const fileSpec of filesToRead) {
            const filePath = path.join(rootDir, fileSpec.name);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    // Clean possible extra trailing characters like 's' or newline
                    const sanitizedContent = content.trim().replace(/}[s\s]*$/, '}');
                    const data = JSON.parse(sanitizedContent);
                    if (data.payload) {
                        console.log(`[AutomationLoop] Read metric from ${fileSpec.name}:`, data.payload);
                        // Map keys
                        if (fileSpec.key === 'agent_state') {
                            if (data.payload.energy !== undefined)
                                this.metrics.agent_energy = data.payload.energy;
                            if (data.payload.status !== undefined)
                                this.metrics.unreal_bridge = data.payload.status === 'active' ? 'online' : 'offline';
                        }
                        else if (fileSpec.key === 'metric_update') {
                            if (data.payload.energy !== undefined)
                                this.metrics.agent_energy = data.payload.energy;
                            if (data.payload.views !== undefined)
                                this.metrics.youtube_views = data.payload.views;
                        }
                        else if (fileSpec.key === 'pulse_update') {
                            if (data.payload.pulse !== undefined)
                                this.metrics.pulse_level = data.payload.pulse;
                        }
                        else if (fileSpec.key === 'evolution_patch') {
                            if (data.payload.intensity !== undefined) {
                                this.metrics.metric_stream_variance = data.payload.intensity * 0.8;
                                this.metrics.evolution_depth = Math.round(data.payload.intensity * 10);
                                this.metrics.evolution_magnitude = data.payload.intensity * 2.0;
                                this.metrics.evolution_phase = data.payload.intensity;
                            }
                        }
                    }
                }
                catch (err) {
                    console.error(`[AutomationLoop] Failed parsing ${fileSpec.name}:`, err.message);
                }
            }
        }
        console.log('[AutomationLoop] Current system metrics:', JSON.stringify(this.metrics));
    }
    /**
     * Step 2: Derive Signals
     */
    derive_signals() {
        console.log('[Loop Step] 2/7 - Deriving Signals...');
        const definitions = this.config.signals?.definitions || [];
        this.activeSignals = {};
        for (const def of definitions) {
            let isTriggered = false;
            if (def.type === 'metric_threshold') {
                const metricVal = this.metrics[def.metric || ''];
                const thresholdVal = def.value;
                const operator = def.operator;
                if (metricVal !== undefined) {
                    if (operator === '>')
                        isTriggered = metricVal > thresholdVal;
                    else if (operator === '<')
                        isTriggered = metricVal < thresholdVal;
                    else if (operator === '==')
                        isTriggered = metricVal == thresholdVal;
                    else if (operator === '>=')
                        isTriggered = metricVal >= thresholdVal;
                    else if (operator === '<=')
                        isTriggered = metricVal <= thresholdVal;
                }
            }
            else if (def.type === 'system_state') {
                const metricVal = this.metrics[def.metric || ''];
                const thresholdVal = def.value;
                const operator = def.operator;
                if (metricVal !== undefined) {
                    if (operator === '==')
                        isTriggered = metricVal === thresholdVal;
                }
            }
            else if (def.type === 'composite') {
                if (def.expression) {
                    isTriggered = this.evaluateExpression(def.expression, this.metrics);
                }
            }
            this.activeSignals[def.id] = isTriggered;
            if (isTriggered) {
                console.log(`[AutomationLoop] Signal ACTIVE: ${def.id} (Severity: ${def.severity})`);
            }
        }
    }
    /**
     * Step 3: Select Actions
     */
    select_actions() {
        console.log('[Loop Step] 3/7 - Selecting Actions...');
        const policies = this.config.actions?.policies || [];
        this.selectedActions = [];
        for (const policy of policies) {
            if (policy.mode === 'auto' && this.activeSignals[policy.when_signal]) {
                this.selectedActions.push(policy.do_action);
                console.log(`[AutomationLoop] Selected action ${policy.do_action} from policy ${policy.id}`);
            }
        }
    }
    /**
     * Helper to validate event payload structurally against the schema definition
     */
    validateEvent(payload) {
        // Structural validation mimicking the JSON Schema
        if (!payload.version || typeof payload.version !== 'string')
            return false;
        if (!payload.system || typeof payload.system !== 'string')
            return false;
        if (!payload.event_type || typeof payload.event_type !== 'string')
            return false;
        if (!payload.niagara_system || typeof payload.niagara_system !== 'string')
            return false;
        if (!payload.timestamp || typeof payload.timestamp !== 'string')
            return false;
        if (!payload.parameters || typeof payload.parameters !== 'object')
            return false;
        // Check enum validity
        const validEventTypes = ["pulse_update", "agent_state", "evolution_patch"];
        const validNiagara = ["NS_PulseWaveBurst", "NS_AgentEnergyOrb", "NS_EvolutionFractalBurst"];
        if (!validEventTypes.includes(payload.event_type))
            return false;
        if (!validNiagara.includes(payload.niagara_system))
            return false;
        return true;
    }
    /**
     * Step 4: Emit Events
     */
    emit_events() {
        console.log('[Loop Step] 4/7 - Emitting Events...');
        const actionLibrary = this.config.actions?.library || [];
        for (const actionId of this.selectedActions) {
            const actionDef = actionLibrary.find(a => a.id === actionId);
            if (!actionDef)
                continue;
            // Resolve parameters
            const resolvedParams = {};
            for (const [paramKey, paramSource] of Object.entries(actionDef.parameters)) {
                // Source maps to a metric key or is static
                if (this.metrics[paramSource] !== undefined) {
                    resolvedParams[paramKey] = this.metrics[paramSource];
                }
                else {
                    // If the source is 'signal_severity', find the severity of the signal that triggered it
                    if (paramSource === 'signal_severity') {
                        // Find policy
                        const policies = this.config.actions?.policies || [];
                        const policy = policies.find(p => p.do_action === actionId);
                        const signalDef = this.config.signals?.definitions?.find(s => s.id === policy?.when_signal);
                        resolvedParams[paramKey] = signalDef?.severity || "info";
                    }
                    else {
                        resolvedParams[paramKey] = paramSource;
                    }
                }
            }
            const eventPayload = {
                version: this.config.version,
                system: this.config.system,
                event_type: actionDef.event_type,
                niagara_system: actionDef.niagara_system,
                timestamp: new Date().toISOString(),
                parameters: resolvedParams
            };
            // Validate event payload
            const isValid = this.validateEvent(eventPayload);
            if (isValid) {
                console.log(`[AutomationLoop] Generated Valid Event for ${actionId}:`, JSON.stringify(eventPayload));
                this.eventHistory.push(eventPayload);
                if (this.clientCallback) {
                    this.clientCallback(eventPayload);
                }
            }
            else {
                console.error(`[AutomationLoop] Event validation failed for payload:`, eventPayload);
            }
        }
    }
    /**
     * Step 5: Unreal Executes
     */
    unreal_executes() {
        console.log('[Loop Step] 5/7 - Simulating Unreal Execution feedback...');
        // In a live system, this expects a response back from the WebSocket server on port 17800.
        // We log that the simulation step is running.
    }
    /**
     * Step 6: Log Proof
     */
    log_proof() {
        console.log('[Loop Step] 6/7 - Logging execution proof...');
        const proofEntry = {
            timestamp: new Date().toISOString(),
            activeSignals: Object.keys(this.activeSignals).filter(k => this.activeSignals[k]),
            executedActions: this.selectedActions,
            metricsSnapshot: { ...this.metrics }
        };
        const logPath = path.resolve(process.cwd(), 'automation_proof_log.jsonl');
        try {
            fs.appendFileSync(logPath, JSON.stringify(proofEntry) + '\n', 'utf8');
        }
        catch (err) {
            console.error('[AutomationLoop] Failed to write proof log:', err.message);
        }
    }
    /**
     * Step 7: Update Scores
     */
    update_scores() {
        console.log('[Loop Step] 7/7 - Updating loop scores...');
        // Calculate performance score: base score + XP per executed action
        const actionsCount = this.selectedActions.length;
        const addedXP = actionsCount * 25;
        this.score += addedXP;
        console.log(`[AutomationLoop] Loop complete. XP Earned: +${addedXP}. Total XP: ${this.score}`);
    }
    /**
     * Execute one full tick of the loop
     */
    tick() {
        console.log('\n--- PrimordiaOS Automation Loop Tick Start ---');
        this.collect_metrics();
        this.derive_signals();
        this.select_actions();
        this.emit_events();
        this.unreal_executes();
        this.log_proof();
        this.update_scores();
        console.log('--- PrimordiaOS Automation Loop Tick End ---\n');
    }
    getTelemetry() {
        return {
            metrics: this.metrics,
            activeSignals: this.activeSignals,
            selectedActions: this.selectedActions,
            history: this.eventHistory.slice(-10),
            score: this.score
        };
    }
}
// If run directly, run tick simulation
if (require.main === module) {
    const runner = new AutomationLoop();
    console.log('[AutomationLoop] Running loop diagnostic mode...');
    runner.tick();
}
