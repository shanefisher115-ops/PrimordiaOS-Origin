import { Logger } from '../../core/logger';
import { AgentCore } from './agentCore';

export const AgentScheduler = {
  async tick() {
    Logger.debug('AgentScheduler tick');

    for (const agent of AgentCore.all()) {
      try {
        await agent.run({ tick: true });
      } catch (err) {
        Logger.warn('AgentScheduler agent error', { agent: agent.id });
      }
    }
  }
};
