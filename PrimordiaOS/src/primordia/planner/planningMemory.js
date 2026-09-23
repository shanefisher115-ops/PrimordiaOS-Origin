import { Logger } from '../../core/logger';
const memory = [];
export const PlanningMemory = {
    save(goal, strategy) {
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
