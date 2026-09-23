// monitoring/health-check.ts
// PrimordiaOS Health Check System — full implementation
// Provides system-wide health status and diagnostics

import { primordiaOS } from "../primordia-core/bootstrap";
import { snapshotManager } from "../primordia-core/osmium/snapshots";
import { unrealBridge } from "../primordia-core/unreal/unreal-bridge";

export interface HealthStatus {
    osRunning: boolean;
    latestSnapshot: string | null;
    unrealConnected: boolean;
    ts: number;
}

export class HealthCheck {
    getStatus(): HealthStatus {
        const latestSnapshot = snapshotManager.getLatestSnapshot();
        return {
            osRunning: (primordiaOS as any).started,
            latestSnapshot: latestSnapshot ? latestSnapshot.id : null,
            unrealConnected: (unrealBridge as any).connected || false,
            ts: Date.now()
        };
    }
}

export const healthCheck = new HealthCheck();
