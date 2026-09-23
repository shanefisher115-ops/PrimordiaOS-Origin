import { Logger } from './logger';
import { AntigravityPipeline } from './antigravityPipeline';
export const BuildValidator = {
    run() {
        const safe = AntigravityPipeline.isBuildSafe();
        if (!safe) {
            Logger.error('BuildValidator: build is NOT safe according to Antigravity rules');
            throw new Error('Antigravity validation failed');
        }
        Logger.info('BuildValidator: build is safe');
    },
};
