import { Logger } from '../../core/logger';
import { PipelineRegistry } from './pipelineRegistry';

export const PipelineEngine = {
  async run(pipelineId: string, input: any) {
    const pipeline = PipelineRegistry.get(pipelineId);
    if (!pipeline) {
      Logger.warn('PipelineEngine: pipeline not found', { pipelineId });
      return;
    }

    Logger.info('PipelineEngine running pipeline', { pipelineId });

    let context = input;
    for (const step of pipeline.steps) {
      context = await step(context);
    }

    return context;
  }
};
