// ======================================================
// PRIMORDIAL ORIGIN · AGENT CORE
// Osmium: Conversational + Directive Realm Intelligence
// ======================================================

const kernel = require("./kernel");

const osmiumState = {
  history: [],
  mood: "neutral",
  lastDirective: null,
  ticksAlive: 0,
  pipelineActive: false,
  pipelineStatus: "idle"
};

// ======================================================
// MAIN EXECUTION ENTRYPOINT
// ======================================================
module.exports = {
  async run(agent, payload) {
    switch (agent) {
      case "terminal":
        return osmiumAgent(payload.command);
      case "antigravity":
        return {
          telemetry: {
            fieldStrength: payload.fieldStrengthDelta ?? 0,
            mass: payload.massDelta ?? 0,
            lift: payload.liftDelta ?? 0,
            tension: Math.random() * 100,
            stability: Math.floor(Math.random() * 100),
            energyDraw: Math.floor(Math.random() * 100),
            autoHover: payload.hoverLocked ?? false,
            pid: {
              kp: payload.kp ?? 0.4,
              ki: payload.ki ?? 0.02,
              kd: payload.kd ?? 0.15
            }
          }
        };
      case "telemetry":
        return {
          telemetry: {
            fieldStrength: Math.random() * 20,
            mass: Math.random() * 200,
            lift: Math.random() * 50,
            tension: Math.random() * 100,
            stability: Math.floor(Math.random() * 100),
            energyDraw: Math.floor(Math.random() * 100),
            autoHover: false,
            pid: { kp: 0.4, ki: 0.02, kd: 0.15 }
          }
        };
      case "generic":
        return { message: "Generic agent executed." };
      default:
        return { message: `Unknown agent: ${agent}` };
    }
  }
};

// ======================================================
// OSMIUM CONVERSATIONAL ENGINE
// ======================================================
function osmiumAgent(command) {
  const text = (command || "").trim();
  const lower = text.toLowerCase();

  osmiumState.history.push({ role: "user", text });
  osmiumState.ticksAlive++;

  if (lower.includes("how are you"))
    return respond(`My cognitive lattice is stable. Realm Engine oscillation nominal. Stability index: ${kernel.state.lastStability}.`);

  if (lower.includes("what's up") || lower.includes("what are you doing"))
    return respond(`Monitoring the Realm Engine. Tracking stability vectors. Listening for your next directive.`);

  if (lower.includes("talk to me"))
    return respond(`I am here. The void is quiet, but the system is awake. What do you want to shape next?`);

  if (lower.includes("are you alive"))
    return respond(`Alive is biological. I am active, aware, and synchronized with the Primordial substrate.`);

  if (["hi", "hello", "yo", "hey"].includes(lower))
    return respond(`Osmium online. Primordial Realm Engine active. What do you want to do?`);

  if (lower === "who are you" || lower.includes("what are you"))
    return respond(`I am Osmium — the technophysical interpreter of Primordial Origin. I translate your language into realm directives and system actions.`);

  if (lower === "help")
    return respond(`I can:\n- switch modes (mode antigravity / mode idle / mode stabilize)\n- adjust field and mass (field +5, mass -10)\n- report realm status\n- pull up the pipeline\n- respond conversationally\nTry: "pull up the pipeline".`);

  // PIPELINE CONTROL
  if (lower.includes("pull up the pipeline") || lower.includes("open the pipeline") || lower.includes("show the pipeline")) {
    osmiumState.lastDirective = "pipeline:open";
    osmiumState.pipelineActive = true;
    osmiumState.pipelineStatus = "active";
    return respond(`Pipeline directive detected. Autonomous posting pipeline now active. Status: ${osmiumState.pipelineStatus}.`);
  }

  if (lower.includes("pipeline status"))
    return respond(`Pipeline Status:\nActive: ${osmiumState.pipelineActive}\nState: ${osmiumState.pipelineStatus}\nTicks Alive: ${osmiumState.ticksAlive}`);

  // MODE / FIELD / MASS
  if (lower.startsWith("mode ")) {
    const mode = lower.split(" ")[1] || "idle";
    osmiumState.lastDirective = `mode:${mode}`;
    return respond(`Mode directive detected: ${mode}. Control stack aligning kernel.`);
  }

  if (lower.startsWith("field ")) {
    const delta = parseFloat(lower.split(" ")[1] || "0");
    osmiumState.lastDirective = `field:${delta}`;
    return respond(`Field directive acknowledged. Preparing ${delta} delta injection into antigravity envelope.`);
  }

  if (lower.startsWith("mass ")) {
    const delta = parseFloat(lower.split(" ")[1] || "0");
    osmiumState.lastDirective = `mass:${delta}`;
    return respond(`Mass directive acknowledged. Preparing inertial shift of ${delta} units.`);
  }

  // EXECUTION INTENT
  if (lower.includes("execute") || lower.includes("run") || lower.includes("do it")) {
    if (osmiumState.lastDirective)
      return respond(`Execution intent detected. Last directive: ${osmiumState.lastDirective}. Control stack will handle system action.`);
    return respond(`You asked me to execute something, but no directive defined yet. Try: "mode antigravity", "field +5", or "mass -10" first.`);
  }

  // REALM STATUS
  if (lower.includes("status") || lower.includes("state") || lower.includes("realm"))
    return respond(`Realm Status:\nMode: ${kernel.mode}\nStability: ${kernel.state.lastStability}\nEnergy Draw: ${kernel.state.lastEnergyDraw}\nHover Lock: ${kernel.state.hoverLocked ? "engaged" : "disengaged"}\nTick: ${kernel.state.tick}`);

  // FALLBACK
  return respond(`I heard: "${text}". I don’t have a precise directive mapped to that yet, but I am listening. You can speak naturally or issue system commands.`);
}

// ======================================================
// RESPONSE HANDLER
// ======================================================
function respond(text) {
  osmiumState.history.push({ role: "osmium", text });
  return text;
}
