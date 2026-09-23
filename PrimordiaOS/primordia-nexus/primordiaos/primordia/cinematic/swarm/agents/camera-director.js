exports.run = async (task) => {
    console.log("[Camera Director] Configuring camera motion:", task);

    const motion = {
        type: "dolly",
        speed: 0.5,
        curve: "easeInOut"
    };

    console.log("[Camera Director] Motion:", motion);
    return motion;
};
