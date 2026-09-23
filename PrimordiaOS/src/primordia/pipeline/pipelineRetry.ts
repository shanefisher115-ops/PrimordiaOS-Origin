import { Logger } from '../../core/logger';

export const PipelineRetry = {
  async retry(step: any, ctx: any, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await step(ctx);
      } catch (err) {
        Logger.warn('PipelineRetry attempt failed', { attempt: i + 1 });
      }
    }
    throw new Error('PipelineRetry: all attempts failed');
  }
};
