import { Logger } from '../core/logger';
const records = [];
export const SimulationMemory = {
    snapshot(currentScene, variables) {
        const record = {
            id: `sim_${Date.now()}`,
            scene: currentScene,
            variables: { ...variables },
            timestamp: new Date().toISOString(),
        };
        records.push(record);
        Logger.info('SimulationMemory snapshot stored', { id: record.id, scene: record.scene });
    },
    all() {
        return records;
    },
};
