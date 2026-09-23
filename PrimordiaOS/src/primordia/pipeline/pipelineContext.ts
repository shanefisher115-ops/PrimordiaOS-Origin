export const PipelineContext = {
  create(initial: any) {
    return { ...initial, timestamp: new Date().toISOString() };
  }
};
