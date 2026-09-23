import { Logger } from './logger';
import { AntigravityPipeline } from './antigravityPipeline';
export const VisionBootstrap = {
    init() {
        const safe = AntigravityPipeline.isBuildSafe();
        if (!safe) {
            Logger.error('VisionBootstrap: Antigravity validation failed, refusing to init VisionCore');
            throw new Error('VisionCore init blocked by Antigravity');
        }
        Logger.info('VisionBootstrap: VisionCore ready under Antigravity constraints');
    },
};
