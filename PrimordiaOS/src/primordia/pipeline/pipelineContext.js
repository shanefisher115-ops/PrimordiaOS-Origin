export const PipelineContext = {
    create(initial) {
        return { ...initial, timestamp: new Date().toISOString() };
    }
};
