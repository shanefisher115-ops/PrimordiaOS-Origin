export function createTask(payload: any) {
  const id = "task_" + crypto.randomUUID();

  const task = {
    id,
    payload,
    status: "pending"
  };

  globalThis.PRIMORDIA_TASK_BUS.push({
    type: "TASK_CREATED",
    taskId: id,
    timestamp: Date.now()
  });

  return task;
}
