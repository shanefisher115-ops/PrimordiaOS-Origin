"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = void 0;
const templates_1 = require("./templates");
exports.Generator = {
    generatePipeline({ intent, pipelineType }) {
        const template = templates_1.Templates[pipelineType];
        return template.build(intent);
    },
    async emitArtifacts(pipeline) {
        return {
            scripts: pipeline.scripts,
            folders: pipeline.folders,
            docs: pipeline.docs,
            config: pipeline.config
        };
    }
};
