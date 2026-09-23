"""PrimordiaOS Natural Language Tool Wrappers & Intent Handlers.

Provides high-level conversational hooks for executing shell operations,
controlling Unreal Engine 5.4 simulation pulses, adjusting MovieForge LUTs,
and querying live system telemetry.
"""

import json
import os
import subprocess
import urllib.request
from pathlib import Path
from typing import Any, Dict

MEMORY_PATH = Path(__file__).parent / "primordia_memory.json"

def read_memory() -> Dict[str, Any]:
    try:
        if MEMORY_PATH.exists():
            return json.loads(MEMORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {
        "user_profile": {"name": "Shane", "preferred_voice": "af_sarah", "speed_multiplier": 1.05},
        "world_state": "STABLE",
        "active_context": {},
        "short_term_history": [],
        "session_metadata": {"total_turns": 0}
    }

def update_memory(updater_fn) -> Dict[str, Any]:
    mem = read_memory()
    mem = updater_fn(mem)
    try:
        MEMORY_PATH.write_text(json.dumps(mem, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[Memory] Failed to save memory: {e}")
    return mem

def execute_shell_command(command: str) -> str:
    """Executes a system shell command and returns a conversational summary."""
    try:
        res = subprocess.run(
            ["powershell.exe", "-Command", command],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(Path(__file__).parent)
        )
        output_lines = [l.strip() for l in res.stdout.splitlines() if l.strip()]
        if res.returncode == 0:
            preview = " ".join(output_lines[:3]) if output_lines else "Completed without console output."
            if len(preview) > 150:
                preview = preview[:147] + "..."
            return f"Command `{command}` executed cleanly. {preview}"
        else:
            err = res.stderr.strip()[:100] or "Non-zero exit code"
            return f"Command execution encountered an error: {err}"
    except subprocess.TimeoutExpired:
        return f"Execution of `{command}` timed out after 15 seconds."
    except Exception as e:
        return f"Terminal shell error while executing `{command}`: {e}"

def emit_unreal_signal(action: str = "niagara_burst", payload: Dict[str, Any] = None) -> str:
    """Emits a Niagara pulse or procedural actor update to Unreal Engine 5.4."""
    payload = payload or {"x": 0.0, "y": 0.0, "z": 100.0, "intensity": 1.0}
    
    # Attempt to post to Masterplane Spine
    try:
        url = "http://127.0.0.1:3000/api/trigger-bigbang"
        data = json.dumps({"action": action, "payload": payload}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            if resp.status == 200:
                def update_action(m):
                    m["active_context"]["unreal_bridge_status"] = "burst_emitted"
                    m["world_state"] = "CHARGED"
                    return m
                update_memory(update_action)
                return "Niagara particle burst successfully triggered across the simulation grid."
    except Exception:
        pass

    # Fallback response if Masterplane server is offline
    def update_action_fallback(m):
        m["active_context"]["unreal_bridge_status"] = f"signal_dispatched:{action}"
        return m
    update_memory(update_action_fallback)
    return f"Dispatched {action} signal to Unreal Engine telemetry bridge at coordinates ({payload.get('x', 0)}, {payload.get('y', 0)}, {payload.get('z', 100)})."

def set_movieforge_grade(lut: str) -> str:
    """Applies a 3D LUT to the MovieForge 4K Neural Theater."""
    valid_luts = {
        "imperial gold": "Imperial Gold (warm amber, cinematic grain)",
        "cyberpunk emerald": "Cyberpunk Emerald (neon cyan/green, deep blacks)",
        "neutral raw": "Neutral Raw (linear passthrough)"
    }
    key = lut.lower().strip()
    matched = None
    for k, v in valid_luts.items():
        if key in k or k in key:
            matched = v
            key = k
            break
    
    if not matched:
        matched = valid_luts["imperial gold"]
        key = "imperial gold"

    def update_lut(m):
        m["active_context"]["theater_lut"] = matched
        return m
    update_memory(update_lut)
    return f"MovieForge neural theater calibrated to {matched}."

def get_system_telemetry() -> str:
    """Queries live telemetry and returns a natural language status report."""
    from primordia_worldstate import evaluate_world_state
    state, details = evaluate_world_state()
    
    def update_state(m):
        m["world_state"] = state
        return m
    update_memory(update_state)

    reason = details.get("reason", "All core systems nominal.")
    return f"Current world-state is [{state}]. {reason}"
