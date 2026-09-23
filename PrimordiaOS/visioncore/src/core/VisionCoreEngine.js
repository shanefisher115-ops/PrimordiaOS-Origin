/**
 * VisionCoreEngine - Director-Grade Creative Intelligence Layer
 * Agent Role: VisionCore Architect
 */
import { VisionCoreLogger } from '../logging/VisionCoreLogger.js';
import { CreativeOrchestrator } from './CreativeOrchestrator.js';
export class VisionCoreEngine {
    static VERSION = '1.0.0';
    static IDENTITY = 'Director-Grade Creative Intelligence Layer';
    logger;
    orchestrator;
    startTime;
    constructor(orchestrator) {
        this.logger = new VisionCoreLogger('VisionCoreEngine');
        this.orchestrator = orchestrator || new CreativeOrchestrator();
        this.startTime = Date.now();
        this.logger.info(`VisionCoreEngine initialized [${VisionCoreEngine.IDENTITY}] v${VisionCoreEngine.VERSION}`);
    }
    /**
     * Process a plain-text creative directive through the full Director-Grade Intelligence pipeline.
     * Returns structured JSON conforming to the VISIONCORE_OUTPUT specification.
     */
    async processDirective(directive, options) {
        const traceId = options?.traceId || `vc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        this.logger.info(`Executing creative directive: "${directive.substring(0, 50)}..." [Trace: ${traceId}]`);
        const orchestrationReq = {
            prompt: directive,
            targetStyle: options?.targetStyle,
            enableRender: options?.enableRender ?? true,
            enableInnovation: options?.enableInnovation ?? true,
            enableForecasting: options?.enableForecasting ?? true,
            resolutionWidth: options?.resolutionWidth,
            resolutionHeight: options?.resolutionHeight,
            traceId
        };
        const result = await this.orchestrator.orchestrate(orchestrationReq);
        // 1. Synthesize Interpretation
        const interpretation = {
            rawDirective: directive,
            thematicAltitude: result.idea.thematicAltitude,
            aestheticProfile: `${result.style.name} (${result.style.aestheticCategory})`,
            intentSummary: `Director-level extraction reveals an architectural mandate for: ${result.idea.logline}`,
            antiCollapseFrictionScore: Math.round(result.idea.frictionLevel * 100)
        };
        // 2. Synthesize Creative Direction
        const leadScene = result.script.scenes[0];
        const creativeDirection = {
            premise: result.idea.premise,
            logline: result.idea.logline,
            cinematography: {
                lens: `${result.style.optics.focalLengthMm}mm ${result.style.optics.lensType} (${result.style.optics.aperture})`,
                lightingScheme: `${result.style.lighting.keyToFillRatio} Key-to-Fill at ${result.style.lighting.colorTemperatureKelvin}K`,
                colorGradeLut: result.style.lighting.lutName,
                contrastCurve: result.style.lighting.contrastCurve,
                palette: result.style.colorPalette
            },
            soundtrackDirectives: result.script.soundtrackStyle,
            sceneCount: result.script.scenes.length,
            leadSceneSlug: leadScene ? leadScene.slugline : 'EXT. VOID - UNCHARTED'
        };
        // 3. Synthesize Module Routing
        const moduleRouting = {
            dispatchedModules: result.moduleExecutionPath.map(m => m.module),
            executionTimeline: result.moduleExecutionPath.map(m => ({
                module: m.module,
                status: m.status,
                durationMs: m.durationMs,
                summary: m.details
            })),
            persistedMemoryIds: result.memoryRecordIds,
            renderJobId: result.renderTrace?.jobId
        };
        // 4. Synthesize Next Actions
        const nextActions = [
            {
                action: 'STREAM_NIAGARA_TELEMETRY',
                targetModuleOrSystem: 'Primordia Unreal Engine 5.4 Bridge',
                priority: 'HIGH',
                suggestedPayload: {
                    sceneId: result.scene.sceneId,
                    particleEmitter: result.scene.particles.emitterType,
                    colorHex: result.scene.particles.colorHex,
                    spawnRate: result.scene.particles.spawnRate
                }
            },
            {
                action: 'SYNCHRONIZE_COREFORGE_ARCHIVE',
                targetModuleOrSystem: 'CoreForge Persistent Storage',
                priority: 'MEDIUM',
                suggestedPayload: {
                    memoryIds: result.memoryRecordIds,
                    traceId
                }
            }
        ];
        if (result.renderTrace) {
            nextActions.push({
                action: 'QUEUE_MOVIEFORGE_PLAYBACK',
                targetModuleOrSystem: 'MovieForge 4K Neural Theater',
                priority: 'HIGH',
                suggestedPayload: {
                    jobId: result.renderTrace.jobId,
                    lut: result.style.lighting.lutName,
                    compositeHash: result.renderTrace.compositeArtifact.contentHash
                }
            });
        }
        if (result.pulseDiagnostic && !result.pulseDiagnostic.healthy) {
            nextActions.unshift({
                action: 'RESOLVE_TENSION_ANOMALY',
                targetModuleOrSystem: 'PulseEngine Compensator',
                priority: 'CRITICAL',
                suggestedPayload: {
                    anomalies: result.pulseDiagnostic.anomalies,
                    recommendations: result.pulseDiagnostic.recommendations
                }
            });
        }
        const output = {
            VISIONCORE_OUTPUT: {
                Interpretation: interpretation,
                'Creative Direction': creativeDirection,
                'Module Routing': moduleRouting,
                'Next Actions': nextActions
            }
        };
        this.logger.info(`Directive successfully synthesized into VISIONCORE_OUTPUT format [Trace: ${traceId}]`);
        return output;
    }
    /**
     * Health and diagnostic summary of the VisionCore subsystem.
     */
    getHealthStatus() {
        const quarantined = VisionCoreLogger.getQuarantinedErrors().filter(e => !e.resolved);
        return {
            status: quarantined.length > 0 ? 'DEGRADED' : 'ONLINE',
            engineVersion: VisionCoreEngine.VERSION,
            directorGradeTier: 'Tier-2 Sovereign Director Subsystem',
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            activeMemoryRecords: this.orchestrator.coreForge.count(),
            quarantinedErrors: quarantined.length
        };
    }
    getOrchestrator() {
        return this.orchestrator;
    }
}
