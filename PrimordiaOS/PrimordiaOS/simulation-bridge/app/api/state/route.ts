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
  },
  telemetry: {
    spatial: {
      topologyScale: 1.0,
      boundariesInverted: true,
      dualSpatialStability: true,
      dataUnification: "unified",
      vertexRouting: "spatial reciprocal endpoints"
    },
    temporal: {
      timeOffsetNs: 0,
      flow: "collapsed",
      flowDirection: "simultaneous",
      score: 85,
      antiScore: 85,
      visionCorePerception: "forward and reverse timelines",
      generatorPulseInversion: "PulseWave forward and reverse time"
    },
    causal: {
      chainScale: 1.0,
      boundariesInverted: true,
      ledgerEntriesCount: 14,
      score: 92,
      antiScore: 92,
      osmiumLedgerMode: "causal-null ledger mode",
      eventStatus: "recorded and unrecorded"
    }
  }
};

export async function GET() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      return NextResponse.json(JSON.parse(data));
    } else {
      // Write the default state if it doesn't exist yet
      fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2), "utf-8");
      return NextResponse.json(defaultState);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
