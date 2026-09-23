import { LeftConsole } from "./consoles/leftConsole.js";
import { RightConsole } from "./consoles/rightConsole.js";
import { UpperConsole } from "./consoles/upperConsole.js";
import { LowerConsole } from "./consoles/lowerConsole.js";
import { SpatialGrid } from "./grid.js";
import { HelmRing } from "./helmRing.js";
import { AmbientParticles } from "./particles.js";
export class HUDController {
    leftConsole = new LeftConsole();
    rightConsole = new RightConsole();
    upperConsole = new UpperConsole();
    lowerConsole = new LowerConsole();
    grid = new SpatialGrid();
    helm = new HelmRing();
    particles = new AmbientParticles();
    renderFullHUD() {
        console.log("--------------------------------------------------------------------------------");
        console.log("   [LEFT CONSOLE: SYSTEMS]       |   [HELM: 342° NNW]    |   [RIGHT CONSOLE: CARTOGRAPHY]");
        console.log("   Propulsion: 42% | Shields 35% |   Altitude: Sovereign |   Target: Chamber of Origin   ");
        console.log("--------------------------------------------------------------------------------");
    }
    interpretCommand(cmd) {
        const trimmed = cmd.trim().toLowerCase();
        if (trimmed === "status")
            return "All HUD displays operating at 120 FPS.";
        if (trimmed === "warp")
            return "Spooling hyperspace conduits...";
        return "Command " + cmd + " recognized.";
    }
}
