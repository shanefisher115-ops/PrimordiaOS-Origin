import { Logger } from '../../core/logger';
const pipelines = {};
export const PipelineRegistry = {
    register(id, steps) {
        pipelines[id] = { id, steps };
        Logger.info('PipelineRegistry registered pipeline', { id });
    },
    get(id) {
        return pipelines[id];
    },
    all() {
        return pipelines;
    }
};
