import { Logger } from '../../core/logger';

interface Pipeline {
  id: string;
  steps: Array<(ctx: any) => Promise<any>>;
}

const pipelines: Record<string, Pipeline> = {};

export const PipelineRegistry = {
  register(id: string, steps: Pipeline['steps']) {
    pipelines[id] = { id, steps };
    Logger.info('PipelineRegistry registered pipeline', { id });
  },

  get(id: string) {
    return pipelines[id];
  },

  all() {
    return pipelines;
  }
};
