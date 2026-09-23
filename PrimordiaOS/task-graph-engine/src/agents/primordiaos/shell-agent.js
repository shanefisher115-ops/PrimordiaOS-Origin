export const createShellAgent = (context) => {
    const capability = {
        id: "cap-shell",
        name: "Shell Command Capability",
        description: "Executes shell commands in PrimordiaOS.",
        supportedTaskNames: ["run_shell_command"],
    };
    return {
        id: "agent-shell",
        name: "ShellAgent",
        realm: "primordiaos",
        capabilities: [capability],
    };
};
