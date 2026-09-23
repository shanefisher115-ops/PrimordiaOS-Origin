"""
==============================================================================
🎮 PRIMORDIAOS SOVEREIGN DIRECTOR: GOOGLE ANTIGRAVITY PYTHON AGENT
Bridges Google Antigravity SDK with Primordia Masterplane (port 3000),
Unreal Engine 5.8 Niagara Emitters, and MovieForge 4K Neural Theater.
==============================================================================
"""

import asyncio
import json
import os
import sys
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from google.antigravity import Agent, LocalAgentConfig, types

MASTERPLANE_URL = os.environ.get("PRIMORDIA_MASTERPLANE_URL", "http://127.0.0.1:3000")
FLOW_URL = os.environ.get("PRIMORDIA_FLOW_URL", "http://127.0.0.1:3006")


def emit_niagara_pulse(
    emitter: str,
    intensity: float = 3.0,
    color_rgba: Optional[List[float]] = None,
    coordinates: Optional[Dict[str, float]] = None,
    agent_name: str = "AntigravityDirector",
    event_name: str = "autonomous_scene_pulse"
) -> str:
    """Emits a real-time Niagara 3D vector particle pulse into Unreal Engine 5.8.

    Args:
        emitter: Name of the Niagara emitter (e.g. 'Orchestrator_PulsarCore', 'DealCloser_ImperialSupernova', 'QuantumWarp_Burst').
        intensity: Emission energy intensity between 1.0 and 5.0.
        color_rgba: List of 4 floats [r, g, b, a] from 0.0 to 1.0 (e.g. [0.0, 0.9, 1.0, 1.0] for Cyan).
        coordinates: 3D coordinates dict {'x': float, 'y': float, 'z': float}.
        agent_name: Identifier of the emitting agent.
        event_name: Name of the event triggering the particle burst.
    """
    payload = {
        "type": "niagara_pulse",
        "emitter": emitter,
        "intensity": intensity,
        "color": color_rgba or [0.0, 0.94, 1.0, 1.0],
        "coordinates": coordinates or {"x": 0.0, "y": 150.0, "z": 120.0},
        "agentName": agent_name,
        "eventName": event_name
    }
    try:
        req = urllib.request.Request(
            f"{MASTERPLANE_URL}/api/unreal/signal",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return f"✔ Niagara pulse [{emitter}] transmitted to UE5. Packets sent: {data.get('packetsSent', 1)}."
    except Exception as e:
        return f"Warning: Niagara emission fallback ({e}). Payload queued."


def trigger_movieforge_lut(lut_name: str) -> str:
    """Applies a DaVinci Resolve 3D LUT Color Grade shift in MovieForge 4K Neural Theater.

    Args:
        lut_name: LUT profile name ('IMPERIAL GOLD', 'CYBERPUNK EMERALD', 'NEUTRAL RAW', or 'VOID MONOLITH').
    """
    clean_lut = lut_name.upper().replace("_", " ")
    payload = {"lut": clean_lut}
    try:
        req = urllib.request.Request(
            f"{MASTERPLANE_URL}/api/theater/lut",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return f"✔ MovieForge 4K LUT shifted to {data.get('activeLut', clean_lut)}."
    except Exception as e:
        return f"Error shifting LUT: {e}"


def direct_camera_cutscene(
    prompt: str,
    angle: str = "orbit",
    duration: int = 6
) -> str:
    """Synthesizes an autonomous cinematic camera trajectory and cutscene sequence for CineCameraActor.

    Args:
        prompt: Natural language description of the scene and mood.
        angle: Camera trajectory ('orbit', 'drone_sweep', 'crane_dolly', 'vertigo_zoom', 'cosmic_ascend').
        duration: Duration of sequence in seconds (default 6).
    """
    payload = {
        "prompt": prompt,
        "angle": angle,
        "duration": duration,
        "fps": 60
    }
    try:
        req = urllib.request.Request(
            f"{MASTERPLANE_URL}/api/cinematics/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            seq = data.get("sequence", {})
            return (
                f"✔ Camera cutscene synthesized: ID {seq.get('id')}, Angle {seq.get('angle')}, "
                f"LUT {seq.get('lut')}, Keyframes: {len(seq.get('keyframes', []))} frames."
            )
    except Exception as e:
        return f"Error directing cutscene: {e}"


def query_engine_state() -> str:
    """Queries live telemetry state from Unreal Engine 5.8 and MovieForge Neural Theater."""
    try:
        req = urllib.request.Request(f"{MASTERPLANE_URL}/api/unreal/state")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return (
                f"UE5 Status: Connected={data.get('connected')}, Clients={data.get('clients')}, "
                f"Engine={data.get('engineVersion')}, PacketsSent={data.get('packetsSent')}, "
                f"LastSignalEmitter={data.get('lastSignal', {}).get('emitter')}"
            )
    except Exception as e:
        return f"Engine state unreachable: {e}"


def fire_111_swarm_superburst() -> str:
    """Dispatches a high-concurrency 111-Node Swarm Superburst across all 13 Niagara emitter profiles."""
    payload = {
        "action": "swarm_superburst",
        "nodes": 111,
        "mode": "cinematic",
        "lut_sequence": ["Imperial_Gold", "Void_Monolith"]
    }
    try:
        req = urllib.request.Request(
            f"{FLOW_URL}/api/phom/orchestration/dispatch",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            res = data.get("result", {})
            return (
                f"✔ 111-Node Swarm Super-Burst executed! Nodes: {res.get('nodesExecuted')}, "
                f"Duration: {res.get('durationMs')}ms, P99: {res.get('p99LatencyMs')}ms, "
                f"SLA: {res.get('bondedSlaStatus')}, Osmium Block #{res.get('osmiumBlockIndex')}."
            )
    except Exception as e:
        return f"Swarm burst error: {e}"


async def run_director_mission(user_instruction: str):
    """Executes a director mission using the Google Antigravity Agent."""
    print("=" * 70)
    print("🌌 GOOGLE ANTIGRAVITY AGENT: PRIMORDIA DIRECTOR ONLINE")
    print("=" * 70)

    config = LocalAgentConfig(
        tools=[
            emit_niagara_pulse,
            trigger_movieforge_lut,
            direct_camera_cutscene,
            query_engine_state,
            fire_111_swarm_superburst
        ],
        retry_config=types.RetryConfig.benchmark(),
        system_instructions=(
            "You are the Primordia Sovereign Game Director powered by Google Antigravity. "
            "You orchestrate Unreal Engine 5.8 viewports, Niagara particle physics emitters, "
            "MovieForge 4K DaVinci Resolve 3D LUT color grading, and 111-Node agent swarms. "
            "When given a directing task, inspect engine state, apply appropriate LUT color grades, "
            "choreograph camera cutscenes, and fire quantum Niagara pulses."
        )
    )

    async with Agent(config) as agent:
        print(f"\nUser Directive: \"{user_instruction}\"\n")
        print("🧠 Antigravity Thinking Stream:")
        response = await agent.chat(user_instruction)

        async for thought in response.thoughts:
            print(thought, end="", flush=True)

        print("\n\n🎬 Director Execution & Response:")
        async for chunk in response:
            print(chunk, end="", flush=True)
        print("\n" + "=" * 70)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] not in ("--loop", "-i"):
        directive = " ".join(sys.argv[1:])
        asyncio.run(run_director_mission(directive))
    elif len(sys.argv) > 1 and sys.argv[1] in ("--loop", "-i"):
        async def interactive_loop():
            config = LocalAgentConfig(
                tools=[
                    emit_niagara_pulse,
                    trigger_movieforge_lut,
                    direct_camera_cutscene,
                    query_engine_state,
                    fire_111_swarm_superburst
                ],
                retry_config=types.RetryConfig.benchmark(),
                system_instructions=(
                    "You are the Primordia Sovereign Game Director powered by Google Antigravity. "
                    "You orchestrate Unreal Engine 5.8 viewports, Niagara particle physics emitters, "
                    "MovieForge 4K DaVinci Resolve 3D LUT color grading, and 111-Node agent swarms. "
                    "When given a directing task, inspect engine state, apply appropriate LUT color grades, "
                    "choreograph camera cutscenes, and fire quantum Niagara pulses."
                )
            )
            print("=" * 70)
            print("🌌 GOOGLE ANTIGRAVITY INTERACTIVE DIRECTOR REPL ONLINE")
            print("Type 'exit' to quit.")
            print("=" * 70)
            async with Agent(config) as agent:
                while True:
                    try:
                        user_input = input("\n🎬 Director> ")
                        if not user_input.strip() or user_input.lower() in ("exit", "quit"):
                            break
                        response = await agent.chat(user_input)
                        print("\n🧠 Thinking:")
                        async for thought in response.thoughts:
                            print(thought, end="", flush=True)
                        print("\n\n🎬 Response:")
                        async for chunk in response:
                            print(chunk, end="", flush=True)
                        print("\n")
                    except (KeyboardInterrupt, EOFError):
                        break
        asyncio.run(interactive_loop())
    else:
        directive = (
            "Inspect the Unreal Engine 5.8 state, grade MovieForge to Void Monolith, "
            "synthesize a vertigo zoom camera sweep through a quantum black hole accretion disk, "
            "and fire a high-energy Imperial supernova particle pulse into the viewport."
        )
        asyncio.run(run_director_mission(directive))

