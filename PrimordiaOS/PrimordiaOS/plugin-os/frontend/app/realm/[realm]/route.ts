import { NextResponse } from "next/server";
import fs from "fs";

const STATE_FILE = "C:\\Users\\Shane\\primordiaos\\shared-simulation-state.json";

const defaultState = {
  status: "online",
  realms: {
    interface: {
      state: { status: "bound", name: "Electron Shell", activity: "Rendering surface layout" },
      nullState: { status: "spatial-null", boundaries: "inverted", stability: "dual-spatial" },
      antiState: { status: "spatial-anti", boundaries: "reciprocal", duality: "persona-duality" }
    },
    kernel: {
      state: { status: "running", name: "Codex Authority", activity: "Executing polyglot AST" },
      nullState: { status: "causal-null", ledger: "causal-null-mode", coherence: "unified-tri-null" },
      antiState: { status: "causal-anti", ledger: "anti-ledger-mode", integrity: "dual-causal" }
    },
    portal: {
      state: { status: "running", name: "Portal Boundary", activity: "Routing Cloudflare Gateway proxy" },
      nullState: { status: "temporal-null", perception: "temporal-null-perception", timeline: "anti-simulation" },
      antiState: { status: "temporal-anti", perception: "reciprocal-perception", timeline: "simulation" }
    },
    world: {
      state: { status: "discovered", name: "PrimordiaUnreal World", activity: "Awaiting spatial scene manifest" },
      nullState: { status: "spatial-null", topology: "collapsed", coherence: "mirrored" },
      antiState: { status: "spatial-anti", topology: "expanded", coherence: "bi-directional" }
    }
  }
};

export async function GET(
  request: Request,
  { params }: { params: { realm: string } }
) {
  try {
    const realmName = params.realm.toLowerCase();

    // Verify valid realm
    const validRealms = ["interface", "kernel", "portal", "world"];
    if (!validRealms.includes(realmName)) {
      return NextResponse.json(
        { success: false, error: `Invalid realm: '${params.realm}'. Valid realms are: ${validRealms.join(", ")}` },
        { status: 404 }
      );
    }

    let stateData = defaultState;
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, "utf-8");
        stateData = JSON.parse(data);
      }
    } catch (e) {
      console.warn("Could not load shared simulation state, using default values.");
    }

    const realmData = (stateData.realms as any)[realmName];

    if (!realmData) {
      return NextResponse.json(
        { success: false, error: `Realm data not found for '${realmName}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      realm: realmName,
      state: realmData.state,
      "null-state": realmData.nullState,
      "anti-state": realmData.antiState
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
