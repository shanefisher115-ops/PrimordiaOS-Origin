import { eventBus } from "./eventBus.js";
import { CockpitPhysics } from "./physics.js";
import { CockpitState } from "./state.js";
import { CockpitMetadata } from "./metadata.js";
// Linked Runtime Subsystems
import { HUDController } from "../hud/commandLayer.js";
import { RealmManager } from "../realms/realmManager.js";
import { NodeManager } from "../nodes/nodeManager.js";
import { CockpitSwarmManager } from "../swarm/swarmManager.js";
import { TelemetryManager } from "../telemetry/telemetryManager.js";
import { CinematicDirector } from "../cinematic/transitions.js";
import { PilotAgent } from "../agents/pilot.js";
import { NavigatorAgent } from "../agents/navigator.js";
import { EngineerAgent } from "../agents/engineer.js";
import { TacticianAgent } from "../agents/tactician.js";
import { AgentBus } from "../agents/agentBus.js";
import { HUDOptimizer } from "../evolution/hudOptimizer.js";
import { PhysicsTuner } from "../evolution/physicsTuner.js";
import { VizGenerator } from "../evolution/vizGenerator.js";
import { StyleEvolution } from "../evolution/styleEvolution.js";
import { BootSequence } from "../identity/bootSequence.js";
import { RealmIdentity } from "../identity/realmIdentity.js";
import { VesselIdentity } from "../identity/vesselIdentity.js";
export class PrimordiaCockpit {
    metadata = new CockpitMetadata();
    state = new CockpitState();
    physics = new CockpitPhysics();
    subsystems;
    isBooted = false;
    constructor() {
        this.wireSubsystems();
    }
    wireSubsystems() {
        const hud = new HUDController();
        const realms = new RealmManager();
        const nodes = new NodeManager();
        const swarm = new CockpitSwarmManager();
        const telemetry = new TelemetryManager();
        const cinematic = new CinematicDirector();
        const bus = new AgentBus();
        const pilot = new PilotAgent(bus);
        const navigator = new NavigatorAgent(bus);
        const engineer = new EngineerAgent(bus);
        const tactician = new TacticianAgent(bus);
        const hudOptimizer = new HUDOptimizer();
        const physicsTuner = new PhysicsTuner();
        const vizGenerator = new VizGenerator();
        const styleEvolution = new StyleEvolution();
        const boot = new BootSequence();
        const realm = new RealmIdentity();
        const vessel = new VesselIdentity();
        this.subsystems = {
            hud, realms, nodes, swarm, telemetry, cinematic,
            agents: { pilot, navigator, engineer, tactician, bus },
            evolution: { hudOptimizer, physicsTuner, vizGenerator, styleEvolution },
            identity: { boot, realm, vessel }
        };
        eventBus.emit("cockpit:wired", {
            timestamp: Date.now(),
            subsystemsCount: 10,
            modulesLinked: ["/cockpit/hud", "/cockpit/realms", "/cockpit/nodes", "/cockpit/swarm", "/cockpit/telemetry", "/cockpit/cinematic", "/cockpit/agents", "/cockpit/evolution", "/cockpit/identity"]
        });
    }
    async boot() {
        if (this.isBooted)
            return;
        console.log("");
        console.log("================================================================================");
        console.log("            PRIMORDIAOS ANTIGRAVITY COCKPIT: SOVEREIGN BOOT SEQUENCE           ");
        console.log("================================================================================");
        console.log("Vessel:       " + this.subsystems.identity.vessel.name + " [" + this.subsystems.identity.vessel.callsign + "]");
        console.log("Captain:      " + this.subsystems.identity.vessel.captain + " (Tier 0 Human Sovereign)");
        console.log("Realm:        " + this.subsystems.identity.realm.currentRealm + " (Origin Matrix)");
        console.log("Version:      " + this.metadata.version + " (Protocol: " + this.metadata.protocol + ")");
        console.log("--------------------------------------------------------------------------------");
        await this.subsystems.identity.boot.execute({
            physics: this.physics,
            realms: this.subsystems.realms,
            nodes: this.subsystems.nodes,
            swarm: this.subsystems.swarm,
            telemetry: this.subsystems.telemetry,
            cinematic: this.subsystems.cinematic,
            hud: this.subsystems.hud
        });
        this.isBooted = true;
        eventBus.emit("cockpit:ready", { vessel: this.subsystems.identity.vessel.callsign, timestamp: Date.now() });
        console.log("================================================================================");
        console.log("   COCKPIT ONLINE: ANTIGRAVITY FIELD STABILIZED | ALL 10 SUBSYSTEMS NOMINAL     ");
        console.log("================================================================================");
        console.log("");
    }
    getStatus() {
        return {
            booted: this.isBooted,
            metadata: this.metadata.getInfo(),
            telemetry: this.subsystems.telemetry.getSummary(),
            velocity: this.physics.getVelocity(),
            agentsActive: 4,
            sovereigntyScore: 98
        };
    }
}
export const cockpit = new PrimordiaCockpit();
export default cockpit;
