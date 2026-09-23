import { LeftConsole } from "./consoles/leftConsole.js";
import { RightConsole } from "./consoles/rightConsole.js";
import { UpperConsole } from "./consoles/upperConsole.js";
import { LowerConsole } from "./consoles/lowerConsole.js";
import { SpatialGrid } from "./grid.js";
import { HelmRing } from "./helmRing.js";
import { AmbientParticles } from "./particles.js";

export class HUDController {
  public leftConsole = new LeftConsole();
  public rightConsole = new RightConsole();
  public upperConsole = new UpperConsole();
  public lowerConsole = new LowerConsole();
  public grid = new SpatialGrid();
  public helm = new HelmRing();
  public particles = new AmbientParticles();

  renderFullHUD(): void {
    console.log("--------------------------------------------------------------------------------");
    console.log("   [LEFT CONSOLE: SYSTEMS]       |   [HELM: 342° NNW]    |   [RIGHT CONSOLE: CARTOGRAPHY]");
    console.log("   Propulsion: 42% | Shields 35% |   Altitude: Sovereign |   Target: Chamber of Origin   ");
    console.log("--------------------------------------------------------------------------------");
  }

  interpretCommand(cmd: string): string {
    const trimmed = cmd.trim().toLowerCase();
    if (trimmed === "status") return "All HUD displays operating at 120 FPS.";
    if (trimmed === "warp") return "Spooling hyperspace conduits...";
    return "Command " + cmd + " recognized.";
  }
}