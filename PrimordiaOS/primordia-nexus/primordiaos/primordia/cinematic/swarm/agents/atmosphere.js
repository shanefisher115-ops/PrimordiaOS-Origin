exports.run = async (task) => {
    console.log("[Atmosphere Alchemist] Applying atmosphere:", task);

    const atmosphere = {
        fogDensity: 0.02,
        volumetrics: true,
        skyType: "nebula"
    };

    console.log("[Atmosphere Alchemist] Atmosphere:", atmosphere);
    return atmosphere;
};
