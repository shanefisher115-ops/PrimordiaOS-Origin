export const createDirectoryAgent = (context) => {
    const capability = {
        id: "cap-directory",
        name: "Directory Management Capability",
        description: "Creates, deletes, and lists directories in PrimordiaOS.",
        supportedTaskNames: [
            "create_directory",
            "delete_directory",
            "list_directory",
        ],
    };
    return {
        id: "agent-directory",
        name: "DirectoryAgent",
        realm: "primordiaos",
        capabilities: [capability],
    };
};
