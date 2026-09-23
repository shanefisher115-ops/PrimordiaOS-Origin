exports.run = async (task) => {
    console.log("[Content Writer] Generating front page copy:", task);

    const copy = `
        PrimordiaOS — The Anti-Gravity Operating System.
        A cosmic interface for multi-realm creation.
    `;

    console.log("[Content Writer] Copy:", copy);
    return copy;
};
