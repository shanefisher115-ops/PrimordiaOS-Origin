export const Agent = {
    register(name) {
        console.log('🤖 Agent registered:', name);
    },
    run(task) {
        console.log('⚡ Executing task:', task);
    }
};
Agent.register('core');
