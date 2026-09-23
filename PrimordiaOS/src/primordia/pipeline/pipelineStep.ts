export const PipelineStep = {
  create(fn: (ctx: any) => Promise<any>) {
    return fn;
  }
};
