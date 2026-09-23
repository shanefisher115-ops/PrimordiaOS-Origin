import { runTextToVideoLogged } from "./pipeline-with-logging";
async function main() {
    const prompt = process.argv.slice(2).join(" ") || "Cosmic cathedral of light.";
    try {
        const out = await runTextToVideoLogged(prompt);
        console.log(JSON.stringify({ status: "ok", output: out }));
    }
    catch (e) {
        console.error(JSON.stringify({ status: "error", message: e.message }));
        process.exit(1);
    }
}
main();
