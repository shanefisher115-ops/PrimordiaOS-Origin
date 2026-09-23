import { Logger } from '../../core/logger';
export const PipelineRecovery = {
    async recover(pipelineId, ctx) {
        Logger.warn('PipelineRecovery invoked', { pipelineId });
        return ctx;
    }
};
