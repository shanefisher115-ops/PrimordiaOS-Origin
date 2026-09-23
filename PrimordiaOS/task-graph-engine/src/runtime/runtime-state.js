export const createRuntimeState = () => ({
    tasks: new Map(),
});
export const initRuntimeStateForTasks = (state, tasks) => {
    tasks.forEach(task => {
        state.tasks.set(task.id, {
            task,
            status: "pending",
        });
    });
};
export const updateTaskRuntimeState = (state, taskId, status, result, errorMessage) => {
    const existing = state.tasks.get(taskId);
    if (!existing)
        return;
    existing.status = status;
    existing.lastResult = result;
    existing.errorMessage = errorMessage;
};
