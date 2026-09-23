export const resolveTaskDependencies = (graph) => {
    const tasksById = new Map();
    graph.tasks.forEach(t => tasksById.set(t.id, t));
    const visited = new Set();
    const temp = new Set();
    const ordered = [];
    const visit = (taskId) => {
        if (visited.has(taskId))
            return;
        if (temp.has(taskId)) {
            throw new Error(`Cycle detected in task graph at task: ${taskId}`);
        }
        temp.add(taskId);
        const task = tasksById.get(taskId);
        if (!task) {
            throw new Error(`Task not found in graph: ${taskId}`);
        }
        (task.dependencies ?? []).forEach(depId => visit(depId));
        temp.delete(taskId);
        visited.add(taskId);
        ordered.push(task);
    };
    graph.tasks.forEach(task => visit(task.id));
    return {
        graph,
        orderedTasks: ordered,
    };
};
