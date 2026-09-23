export const PlanningGraph = {
    build(goal) {
        return {
            goal,
            nodes: [
                { id: 'analyze', type: 'analysis' },
                { id: 'options', type: 'generation' },
                { id: 'select', type: 'decision' },
                { id: 'execute', type: 'action' }
            ],
            edges: [
                ['analyze', 'options'],
                ['options', 'select'],
                ['select', 'execute']
            ]
        };
    }
};
