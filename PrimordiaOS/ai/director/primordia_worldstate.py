"""PrimordiaOS World-State Telemetry & Voice Modulation Engine.

Monitors the operational state of PrimordiaOS across STABLE, FLUX, and CHARGED
realms, translating live system metrics into conversational cadence and Kokoro
voice parameters.
"""

import json
import os
import urllib.request
from typing import Any, Dict, Tuple

SPINE_URL = "http://127.0.0.1:3000"

def query_spine_status() -> Dict[str, Any]:
    """Attempts to query the live PrimordiaOS Spine on Port 3000."""
    try:
        req = urllib.request.Request(f"{SPINE_URL}/api/status", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception:
        pass
    return {}

def evaluate_world_state() -> Tuple[str, Dict[str, Any]]:
    """Evaluates the live system telemetry into STABLE, FLUX, or CHARGED."""
    spine_data = query_spine_status()
    
    # 1. Check for CHARGED conditions (Unreal streams, active simulations, Big Bang)
    simulation_active = spine_data.get("simulation_active", False)
    unreal_connected = spine_data.get("unreal_connected", False)
    if simulation_active or unreal_connected:
        return "CHARGED", {
            "reason": "Unreal Engine 5.4 telemetry stream active",
            "spine": spine_data
        }

    # 2. Check for FLUX conditions (active cycles, uncommitted mutations, pipeline pulses)
    cycle_running = spine_data.get("isCycleRunning", False)
    events_count = len(spine_data.get("recent_events", []))
    if cycle_running or events_count > 10:
        return "FLUX", {
            "reason": "Substrate mutation in progress",
            "spine": spine_data
        }

    # 3. Default state is STABLE
    return "STABLE", {
        "reason": "Substrate at rest, zero background mutations",
        "spine": spine_data
    }

def get_voice_modulation(state: str) -> Dict[str, Any]:
    """Returns Kokoro TTS modulation parameters based on world-state."""
    state_upper = state.upper()
    if state_upper == "CHARGED":
        return {
            "state": "CHARGED",
            "voice": "af_sarah",
            "speed": 1.18,
            "tone": "high-velocity, resonant, commanding",
            "prompt_prefix": "[CHARGED STATE] Respond with high urgency and epic clarity."
        }
    elif state_upper == "FLUX":
        return {
            "state": "FLUX",
            "voice": "af_sarah",
            "speed": 1.10,
            "tone": "agile, vigilant, analytical",
            "prompt_prefix": "[FLUX STATE] Respond with focused attention to shifting parameters."
        }
    else:  # STABLE
        return {
            "state": "STABLE",
            "voice": "af_sarah",
            "speed": 1.02,
            "tone": "calm, measured, sovereign confidence",
            "prompt_prefix": "[STABLE STATE] Respond with serene equilibrium and composure."
        }
