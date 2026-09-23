console.log("Local Agent: CAD/CAM cycle running...");

const fs = require("fs");
const taskFile = "cadcam-task.txt";

if (fs.existsSync(taskFile)) {
    const task = fs.readFileSync(taskFile, "utf8");
    console.log("Processing task:", task);

    const output = `Processed locally: ${task} @ ${new Date().toISOString()}`;
    fs.writeFileSync("cadcam-output.txt", output);

    console.log("Output written to cadcam-output.txt");
} else {
    console.log("No CAD/CAM task found.");
}
