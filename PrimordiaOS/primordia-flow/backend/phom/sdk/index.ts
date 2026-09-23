/**
 * ==============================================================================
 * ⭐ PHOM SDK — MASTER EXPORT
 * Public SDK for developing on top of the 11-Layer PHOM sovereign architecture.
 * ==============================================================================
 */

export * from './types';
export * from './eventBus';
export * from './pluginSystem';
export * from './agentHooks';
export * from './pipelineBuilder';

import { createPhomPipeline, PhomPipelineBuilder } from './pipelineBuilder';
import { defaultEventBus } from './eventBus';
import { defaultPluginRegistry } from './pluginSystem';
import { defaultAgentHooks } from './agentHooks';

export const PhomSdk = {
  createPipeline: createPhomPipeline,
  eventBus: defaultEventBus,
  plugins: defaultPluginRegistry,
  hooks: defaultAgentHooks
};

export default PhomSdk;
