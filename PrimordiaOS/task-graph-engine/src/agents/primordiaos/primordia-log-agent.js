export const createPrimordiaLogAgent = (context) => {
    const capability = {
        id: "cap-primordia-log",
        name: "Primordia Logging Capability",
        description: "Writes structured logs to a PrimordiaOS log file.",
        supportedTaskNames: ["write_log_entry"],
    };
    return {
        id: "agent-primordia-log",
        name: "PrimordiaLogAgent",
        realm: "primordiaos",
        capabilities: [capability],
    };
};
