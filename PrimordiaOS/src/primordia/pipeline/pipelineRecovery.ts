import { Logger } from '../../core/logger';

export const PipelineRecovery = {
  async recover(pipelineId: string, ctx: any) {
    Logger.warn('PipelineRecovery invoked', { pipelineId });
    return ctx;
  }
};
