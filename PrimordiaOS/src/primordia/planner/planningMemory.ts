import { Logger } from '../../core/logger';

const memory: any[] = [];

export const PlanningMemory = {
  save(goal: string, strategy: any) {
    const entry = {
      id: `plan_${Date.now()}`,
      goal,
      strategy,
      timestamp: new Date().toISOString()
    };

    memory.push(entry);
    Logger.info('PlanningMemory saved plan', entry);
    return entry;
  },

  all() {
    return memory;
  }
};
