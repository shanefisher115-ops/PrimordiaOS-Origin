import { Logger } from '../../core/logger';

export const PipelineEscalation = {
  escalate(ctx: any) {
    Logger.warn('PipelineEscalation triggered', ctx);
  }
};
