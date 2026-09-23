import { Templates } from "./templates"

export const Generator = {
  generatePipeline({ intent, pipelineType }) {
    const template = Templates[pipelineType]
    return template.build(intent)
  },

  async emitArtifacts(pipeline) {
    return {
      scripts: pipeline.scripts,
      folders: pipeline.folders,
      docs: pipeline.docs,
      config: pipeline.config
    }
  }
}
