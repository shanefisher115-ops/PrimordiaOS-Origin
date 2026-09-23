import { Logger } from '../../core/logger';
export const PipelineEscalation = {
    escalate(ctx) {
        Logger.warn('PipelineEscalation triggered', ctx);
    }
};
