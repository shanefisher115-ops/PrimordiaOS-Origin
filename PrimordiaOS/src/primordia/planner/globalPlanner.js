import { Logger } from '../../core/logger';
import { PlanningGraph } from './planningGraph';
import { PlanningStrategy } from './planningStrategy';
export const GlobalPlanner = {
    async plan(goal) {
        Logger.info('GlobalPlanner planning for goal', { goal });
        const graph = PlanningGraph.build(goal);
        const strategy = await PlanningStrategy.generate(graph);
        return strategy;
    }
};
