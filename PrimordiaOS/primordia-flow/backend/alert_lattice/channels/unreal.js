/**
 * ==============================================================================
 * 🎮 UNREAL ENGINE 5.8 RAIL
 * Niagara particle pulse and CineCamera viewport overlay telemetry bridge.
 * Broadcasts AlertBurst packets to Unreal Engine 5.8 via Primordia Masterplane.
 * ==============================================================================
 */
import { emitNiagaraPulse } from '../../phom/unreal_niagara_bridge';
export class UnrealEngineChannel {
    static masterplaneUrl = process.env.PRIMORDIA_MASTERPLANE_URL || 'http://127.0.0.1:3000';
    static async send(signal, urgency) {
        const start = Date.now();
        try {
            const isCritical = urgency === 'critical' || signal.score >= 90;
            const emitter = isCritical ? 'AlertPulse_Supercritical' : 'AlertPulse_Standard';
            const color = isCritical
                ? [1.0, 0.1, 0.2, 1.0] // Crimson Warning
                : [1.0, 0.65, 0.0, 1.0]; // Thermal Amber
            const hudOverlayText = `[ALERT] ${signal.type.toUpperCase()}: ${signal.title.slice(0, 45)} · Score ${signal.score}`;
            // 1. Direct Niagara Pulse
            const pulseResult = await emitNiagaraPulse({
                type: 'niagara_pulse',
                emitter,
                intensity: Math.max(2.0, (signal.score / 20)),
                color,
                coordinates: {
                    x: (signal.score - 50) * 10,
                    y: 200,
                    z: 250
                },
                velocity: { vx: 0, vy: 0, vz: isCritical ? 120 : 60 },
                metadata: {
                    alertId: signal.id,
                    urgency,
                    hudOverlayText,
                    cameraShake: isCritical,
                    lutProfile: isCritical ? 'Cyberpunk Emerald' : 'Imperial Gold'
                }
            });
            // 2. Direct Masterplane Signal (if online)
            try {
                await fetch(`${this.masterplaneUrl}/api/unreal/signal`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'alert_burst',
                        signalId: signal.id,
                        urgency,
                        title: signal.title,
                        hudText: hudOverlayText,
                        cameraShake: isCritical,
                        timestamp: new Date().toISOString()
                    }),
                    signal: AbortSignal.timeout(2000)
                });
            }
            catch { }
            return {
                channel: 'unreal',
                success: pulseResult.success,
                deliveredAt: Date.now(),
                metadata: {
                    emitter,
                    hudOverlayText,
                    cameraShake: isCritical,
                    latencyMs: Date.now() - start
                }
            };
        }
        catch (err) {
            return {
                channel: 'unreal',
                success: false,
                deliveredAt: Date.now(),
                error: err.message
            };
        }
    }
}
