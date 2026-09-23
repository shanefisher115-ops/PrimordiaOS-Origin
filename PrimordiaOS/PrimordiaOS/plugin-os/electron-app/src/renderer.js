const ipc = window.ipcRenderer;

// TERMINAL
const terminalOutput = document.getElementById("terminal-output");
const terminalInput = document.getElementById("terminal-input");
const terminalSend = document.getElementById("terminal-send");

function printToTerminal(text, type = "system") {
  const line = document.createElement("div");
  line.className = "terminal-line";
  line.style.color = type === "user" ? "#00eaff" : "#ff00ff";
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function sendTerminalCommand() {
  const cmd = terminalInput.value.trim();
  if (!cmd) return;
  printToTerminal(`> ${cmd}`, "user");
  ipc.send("primordial-terminal", cmd);
  terminalInput.value = "";
}

terminalSend.addEventListener("click", sendTerminalCommand);
terminalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTerminalCommand();
});

ipc.on("terminal-response", (_event, text) => printToTerminal(text, "system"));

// TELEMETRY
const telemetryOutput = document.getElementById("telemetry-output");
ipc.on("ui-update", (_event, telemetry) => {
  telemetryOutput.innerHTML = `
    <div>Field Strength: ${telemetry.fieldStrength ?? 0}</div>
    <div>Mass: ${telemetry.mass ?? 0}</div>
    <div>Lift: ${telemetry.lift ?? 0}</div>
    <div>Tension: ${telemetry.tension ?? 0}</div>
    <div>Stability: ${telemetry.stability ?? 0}</div>
    <div>Energy Draw: ${telemetry.energyDraw ?? 0}</div>
    <div>Mode: ${telemetry.mode}</div>
    <div>Tick: ${telemetry.tick}</div>
  `;
});

// PIPELINE
const pipelinePanel = document.getElementById("pipeline-panel");
const pipelineLog = document.getElementById("pipeline-log");

function appendPipelineLog(text) {
  const line = document.createElement("div");
  line.className = "pipeline-log-line";
  line.textContent = text;
  pipelineLog.appendChild(line);
  pipelineLog.scrollTop = pipelineLog.scrollHeight;
}

ipc.on("pipeline-open", () => {
  pipelinePanel.style.display = "block";
  appendPipelineLog("Pipeline panel opened by Osmium.");
});
ipc.on("pipeline-start-engine", () => appendPipelineLog("Posting engine start requested by Osmium."));
ipc.on("pipeline-log", (_event, text) => appendPipelineLog(text));
