#!/usr/bin/env python3
"""PrimordiaOS Visual Cockpit Bridge & Real-Time Telemetry Server.

Provides a unified aiohttp HTTP + SSE + WebSocket API layer on port 5055:
1. Adapts PrimordiaOS 7-realm manifest and live substrate telemetry.
2. Binds to persistent Antigravity Agent session (primordiaos-sovereign-session-001-main).
3. Streams cognitive thoughts, tool calls, and text tokens to Cockpit HUD in real time.
4. Dispatches realm-specific controls (Unreal Niagara pulse, MovieForge LUTs, Memory).
"""

import asyncio
import datetime
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load environment
ROOT_DIR = Path(__file__).parent.resolve()
ENV_PATH = ROOT_DIR / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("GEMINI_API_KEY="):
            os.environ["GEMINI_API_KEY"] = line.strip().split("=", 1)[1].strip()

from aiohttp import web
from google.antigravity import Agent, LocalAgentConfig, hooks, triggers, types
from google.antigravity.hooks import policy
from google.antigravity.types import SessionContinuationMode, from_file

from kokoro_voice import speak
from primordia_tools import (
    emit_unreal_signal,
    execute_shell_command,
    get_system_telemetry,
    read_memory,
    set_movieforge_grade,
    update_memory,
)
from primordia_worldstate import evaluate_world_state, get_voice_modulation

MANIFEST_PATH = ROOT_DIR / "primordia_realms.json"
PERSONA_PATH = ROOT_DIR / "PrimordiaOS-Persona.md"
COCKPIT_HTML = ROOT_DIR / "cockpit" / "realms.html"

# Global references
global_agent: Optional[Agent] = None
sse_listeners: List[web.Response] = []
recent_events: List[Dict[str, Any]] = []

def log_realm_event(realm_id: str, action: str, details: Any):
    evt = {
        "realm": realm_id,
        "action": action,
        "details": details,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    recent_events.append(evt)
    if len(recent_events) > 50:
        recent_events.pop(0)
    return evt

def load_manifest() -> Dict[str, Any]:
    if MANIFEST_PATH.exists():
        try:
            return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[Bridge:ManifestError] {e}")
    return {"name": "PrimordiaOS", "realms": []}

def get_realm_snapshot(realm_id: str) -> Dict[str, Any]:
    state, telemetry = evaluate_world_state()
    mem = read_memory()
    modulation = get_voice_modulation(state)

    if realm_id == "conversation":
        history = mem.get("short_term_history", [])
        last_turn = history[-1] if history else {}
        token_audit = mem.get("token_audit", {})
        return {
            "status": "nominal",
            "metrics": {
                "total_turns": mem.get("session_metadata", {}).get("total_turns", 0),
                "last_active": mem.get("session_metadata", {}).get("last_active", "N/A"),
                "total_tokens_consumed": token_audit.get("total_tokens", 0),
                "last_turn_tokens": token_audit.get("last_turn", {}).get("total", 0)
            },
            "events": history[-5:],
            "latest": last_turn
        }

    elif realm_id == "worldstate":
        return {
            "status": state.lower(),
            "metrics": {
                "state": state,
                "cpu_percent": telemetry.get("cpu_percent", 0),
                "ram_percent": telemetry.get("ram_percent", 0),
                "disk_mutations": telemetry.get("disk_mutations", 0),
                "spine_port": telemetry.get("spine_port", 3000),
                "unreal_ws_port": telemetry.get("unreal_ws_port", 17800),
                "voice_speed": modulation.get("speed", 1.05),
                "preferred_voice": modulation.get("voice", "af_sarah")
            },
            "events": [e for e in recent_events if e["realm"] == "worldstate"][-5:]
        }

    elif realm_id == "tools":
        act_ctx = mem.get("active_context", {})
        return {
            "status": "active",
            "metrics": {
                "unreal_bridge_status": act_ctx.get("unreal_bridge_status", "standby"),
                "movieforge_grade": act_ctx.get("theater_lut", "Imperial Gold"),
                "last_action": act_ctx.get("last_action", "Subsystem initialized")
            },
            "events": [e for e in recent_events if e["realm"] == "tools"][-8:]
        }

    elif realm_id == "vision":
        return {
            "status": "ready",
            "metrics": {
                "supported_formats": ["png", "jpg", "jpeg", "webp", "pdf"],
                "active_vision_model": "gemini-3.6-flash",
                "last_attachment": mem.get("active_context", {}).get("last_attachment", "none")
            },
            "events": [e for e in recent_events if e["realm"] == "vision"][-5:]
        }

    elif realm_id == "audio":
        return {
            "status": "online",
            "metrics": {
                "engine": "Kokoro ONNX v0.19",
                "daemon_endpoint": "http://127.0.0.1:5050",
                "sample_rate": 24000,
                "active_voice": modulation.get("voice", "af_sarah"),
                "active_speed": modulation.get("speed", 1.05)
            },
            "events": [e for e in recent_events if e["realm"] == "audio"][-5:]
        }

    elif realm_id == "memory":
        return {
            "status": "synchronized",
            "metrics": {
                "user_name": mem.get("user_profile", {}).get("name", "Shane"),
                "user_role": mem.get("user_profile", {}).get("role", "Human Sovereign (Tier 0)"),
                "active_world_state": mem.get("world_state", "STABLE"),
                "active_context": mem.get("active_context", {}),
                "total_history_turns": len(mem.get("short_term_history", []))
            },
            "events": mem.get("short_term_history", [])[-5:]
        }

    elif realm_id == "autonomy":
        return {
            "status": "armed",
            "metrics": {
                "session_id": "primordiaos-sovereign-session-001-main",
                "storage_substrate": "sessions/primordiaos-sovereign-session-001-main.db",
                "watchdog_interval_sec": 60,
                "policies": ["policy.allow_all()"],
                "antigrav_compliance": "PASSED (76/100)"
            },
            "events": [e for e in recent_events if e["realm"] == "autonomy"][-5:]
        }

    return {"status": "unknown", "metrics": {}, "events": []}

# =============================================================================
# aiohttp Route Handlers
# =============================================================================

async def handle_root(request: web.Request) -> web.Response:
    if COCKPIT_HTML.exists():
        return web.Response(text=COCKPIT_HTML.read_text(encoding="utf-8"), content_type="text/html")
    return web.Response(text="<h1>PrimordiaOS Cockpit Loading...</h1>", content_type="text/html")

async def handle_get_realms(request: web.Request) -> web.Response:
    manifest = load_manifest()
    result = []
    for realm in manifest.get("realms", []):
        r_id = realm["id"]
        snapshot = get_realm_snapshot(r_id)
        result.append({
            **realm,
            "live": snapshot
        })
    return web.json_response({
        "sovereign": manifest.get("sovereign", "Shane (Tier 0)"),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "realms": result
    })

async def handle_get_realm_by_id(request: web.Request) -> web.Response:
    realm_id = request.match_info.get("id", "").lower()
    snapshot = get_realm_snapshot(realm_id)
    return web.json_response({
        "realm": realm_id,
        "data": snapshot,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })

async def handle_realm_action(request: web.Request) -> web.Response:
    realm_id = request.match_info.get("id", "").lower()
    data = await request.json() if request.can_read_body else {}
    action = data.get("action", "")
    params = data.get("params", {})

    log_realm_event(realm_id, action, params)

    if realm_id == "tools":
        if action == "niagara_burst":
            res = emit_unreal_signal(params.get("signal", "niagara_burst"), params.get("payload", {}))
            return web.json_response({"success": True, "result": res})
        elif action == "movieforge_imperial":
            res = set_movieforge_grade("Imperial Gold")
            return web.json_response({"success": True, "result": res})
        elif action == "movieforge_emerald":
            res = set_movieforge_grade("Cyberpunk Emerald")
            return web.json_response({"success": True, "result": res})
        elif action == "exec_shell":
            cmd = params.get("command", "Get-Date")
            res = execute_shell_command(cmd)
            return web.json_response({"success": True, "result": res})

    elif realm_id == "worldstate":
        if action == "force_stable":
            update_memory(lambda m: {**m, "world_state": "STABLE"})
            return web.json_response({"success": True, "world_state": "STABLE"})
        elif action == "refresh_telemetry":
            state, tel = evaluate_world_state()
            return web.json_response({"success": True, "world_state": state, "telemetry": tel})

    elif realm_id == "audio":
        if action == "test_speech":
            msg = params.get("message", "PrimordiaOS Kokoro neural audio online.")
            speak(msg)
            return web.json_response({"success": True, "spoken": msg})

    elif realm_id == "memory":
        if action == "flush_context":
            update_memory(lambda m: {**m, "short_term_history": []})
            return web.json_response({"success": True, "history_cleared": True})

    return web.json_response({"success": False, "error": f"Unknown action '{action}' for realm '{realm_id}'"}, status=400)

async def handle_chat_stream(request: web.Request) -> web.StreamResponse:
    """Streams conversational turn with real-time thought deltas and token chunks via SSE."""
    body = await request.json() if request.can_read_body else {}
    raw_prompt = body.get("prompt", "").strip()
    image_path = body.get("image_path", "").strip()

    if not raw_prompt:
        return web.json_response({"error": "Prompt cannot be empty"}, status=400)

    response = web.StreamResponse(
        status=200,
        reason='OK',
        headers={
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        }
    )
    await response.prepare(request)

    global global_agent
    if not global_agent:
        err_msg = json.dumps({"type": "error", "message": "Antigravity Agent not initialized."})
        await response.write(f"data: {err_msg}\n\n".encode("utf-8"))
        return response

    world_state, _ = evaluate_world_state()
    modulation = get_voice_modulation(world_state)
    voice = modulation["voice"]
    speed = modulation["speed"]

    # Build prompt payload
    attachments = []
    if image_path:
        p = Path(image_path)
        if p.exists():
            try:
                attachments.append(from_file(str(p.resolve())))
                await response.write(f"data: {json.dumps({'type': 'attachment', 'name': p.name})}\n\n".encode("utf-8"))
            except Exception as e:
                print(f"[Bridge:AttachmentError] {e}")

    turn_prompt = f"[{world_state} state] {raw_prompt}"
    payload = [turn_prompt] + attachments if attachments else turn_prompt

    accumulated_text = []
    sentence_buffer = ""

    try:
        chat_resp = await global_agent.chat(payload)
        async for chunk in chat_resp.chunks:
            # 1. Thought Stream
            if isinstance(chunk, types.Thought):
                data = json.dumps({"type": "thought", "text": chunk.text})
                await response.write(f"data: {data}\n\n".encode("utf-8"))

            # 2. Tool Calls
            elif isinstance(chunk, types.ToolCall):
                data = json.dumps({"type": "tool_call", "name": chunk.name, "args": getattr(chunk, 'args', {})})
                await response.write(f"data: {data}\n\n".encode("utf-8"))
                log_realm_event("tools", f"executed_{chunk.name}", getattr(chunk, 'args', {}))

            # 3. Conversational Text Tokens
            elif isinstance(chunk, types.Text):
                accumulated_text.append(chunk.text)
                sentence_buffer += chunk.text
                data = json.dumps({"type": "token", "text": chunk.text})
                await response.write(f"data: {data}\n\n".encode("utf-8"))

                # Sentence-by-sentence vocalization
                if re.search(r'[.!?]\s*$', sentence_buffer) and len(sentence_buffer.strip()) > 3:
                    clean_s = sentence_buffer.strip()
                    sentence_buffer = ""
                    speak(clean_s, voice=voice, speed=speed)
                    log_realm_event("audio", "vocalized_sentence", clean_s)

        # Flush trailing speech
        if sentence_buffer.strip():
            speak(sentence_buffer.strip(), voice=voice, speed=speed)
            log_realm_event("audio", "vocalized_sentence", sentence_buffer.strip())

        full_reply = "".join(accumulated_text).strip()

        # Token usage
        token_meta = {}
        if chat_resp.usage_metadata:
            total_t = getattr(chat_resp.usage_metadata, "total_token_count", 0)
            prompt_t = getattr(chat_resp.usage_metadata, "prompt_token_count", 0)
            cand_t = getattr(chat_resp.usage_metadata, "candidates_token_count", 0)
            token_meta = {"total": total_t, "prompt": prompt_t, "candidates": cand_t}

            def record_tokens(mem):
                audit = mem.setdefault("token_audit", {"total_tokens": 0, "total_turns": 0})
                audit["total_tokens"] += total_t
                audit["total_turns"] += 1
                audit["last_turn"] = {**token_meta, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
                return mem
            update_memory(record_tokens)

        # Record turn to memory
        def record_history(mem):
            h = mem.get("short_term_history", [])
            h.append({
                "user": raw_prompt,
                "os": full_reply,
                "world_state": world_state,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })
            mem["short_term_history"] = h[-10:]
            m_meta = mem.get("session_metadata", {})
            m_meta["total_turns"] = m_meta.get("total_turns", 0) + 1
            m_meta["last_active"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            mem["session_metadata"] = m_meta
            return mem
        update_memory(record_history)

        done_payload = json.dumps({
            "type": "done",
            "reply": full_reply,
            "world_state": world_state,
            "tokens": token_meta
        })
        await response.write(f"data: {done_payload}\n\n".encode("utf-8"))

    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "quota" in err_str.lower():
            err_reply = "Google API free-tier rate limit active (20 requests limit). Standby for cooldown."
        elif "503" in err_str:
            err_reply = "Upstream model experiencing transient high demand (503). Substrate standing by."
        else:
            err_reply = f"Neural uplink turbulence ({type(e).__name__})."

        await response.write(f"data: {json.dumps({'type': 'error', 'message': err_reply})}\n\n".encode("utf-8"))
        speak(err_reply, voice=voice, speed=speed)

    return response

async def handle_render_video(request: web.Request) -> web.Response:
    try:
        try:
            data = await request.json()
        except Exception:
            data = {}
        input_data = data.get("input", "Sovereign Neural Render")
        output_path = data.get("output_path", "out/render.mp4")

        from video_surface import render_video, generate_directive_frames
        input_p = Path(input_data)
        if input_p.exists() and input_p.is_dir():
            frame_files = sorted([str(p) for p in input_p.glob("*.png")] + [str(p) for p in input_p.glob("*.jpg")])
            if not frame_files:
                return web.json_response({"success": False, "error": f"No frame images found in {input_data}"}, status=400)
            out = render_video(frame_files, None, output_path)
        else:
            frames, audio = generate_directive_frames(input_data, duration_sec=3, fps=24)
            out = render_video(frames, audio, output_path, fps=24)

        log_realm_event("tools", "render_video", {"output_path": str(out)})
        return web.json_response({"success": True, "output_path": str(out)})
    except Exception as e:
        return web.json_response({"success": False, "error": str(e)}, status=500)

# =============================================================================
# Lifecycle Hooks & Watchdog Trigger
# =============================================================================

@hooks.pre_turn
async def bridge_pre_turn_hook(prompt: str) -> types.HookResult:
    preview = prompt.replace("\n", " ")[:60]
    log_realm_event("autonomy", "pre_turn_intercept", preview)
    return types.HookResult(allow=True)

@hooks.on_tool_error
async def bridge_tool_error_hook(err: Exception) -> None:
    log_realm_event("tools", "tool_fault", f"{type(err).__name__}: {err}")

async def bridge_watchdog_trigger(ctx: triggers.TriggerContext):
    state, tel = evaluate_world_state()
    log_realm_event("autonomy", "watchdog_tick", {"state": state, "cpu": tel.get("cpu_percent")})

def build_instructions() -> str:
    persona_text = ""
    if PERSONA_PATH.exists():
        persona_text = PERSONA_PATH.read_text(encoding="utf-8")
    else:
        persona_text = "You are the vocal core and operating consciousness of PrimordiaOS."
    mem = read_memory()
    user_name = mem.get("user_profile", {}).get("name", "Shane")
    world_state = mem.get("world_state", "STABLE")
    return f"{persona_text}\n\nCurrent Sovereign: {user_name} (Tier 0). World-State: [{world_state}]. Respond concisely in 1-3 punchy sentences."

# =============================================================================
# Server App Factory & Background Task
# =============================================================================

async def app_factory():
    global global_agent

    sessions_dir = ROOT_DIR / "sessions"
    sessions_dir.mkdir(exist_ok=True)
    app_data_dir = ROOT_DIR / ".primordia_storage"
    app_data_dir.mkdir(exist_ok=True)
    conversation_id = "primordiaos-sovereign-session-001-main"

    instructions = build_instructions()
    agent_config = LocalAgentConfig(
        model="gemini-3.6-flash",
        system_instructions=instructions,
        tools=[
            get_system_telemetry,
            emit_unreal_signal,
            set_movieforge_grade,
            execute_shell_command,
        ],
        policies=[policy.allow_all()],
        hooks=[bridge_pre_turn_hook, bridge_tool_error_hook],
        triggers=[triggers.every(60, bridge_watchdog_trigger)],
        save_dir=str(sessions_dir),
        conversation_id=conversation_id,
        session_continuation_mode=SessionContinuationMode.CREATE_OR_RESUME,
        app_data_dir=str(app_data_dir),
        retry_config=types.RetryConfig(
            api_retry=types.ModelAPIRetryConfig(
                max_retries=2,
                initial_sleep_duration_ms=16000,
                exponential_multiplier=1.5,
            )
        ),
    )

    # Instantiate Agent
    global_agent = Agent(agent_config)
    await global_agent.__aenter__()
    print("[CockpitBridge] Antigravity Agent Session initialized (Session ID: primordiaos-sovereign-session-001-main)")

    app = web.Application()
    app.router.add_get("/", handle_root)
    app.router.add_get("/realms.html", handle_root)
    app.router.add_get("/api/realms", handle_get_realms)
    app.router.add_get("/api/realms/{id}", handle_get_realm_by_id)
    app.router.add_post("/api/realms/{id}/action", handle_realm_action)
    app.router.add_post("/api/chat", handle_chat_stream)
    app.router.add_post("/render_video", handle_render_video)

    async def on_cleanup(app):
        if global_agent:
            await global_agent.__aexit__(None, None, None)
            print("[CockpitBridge] Agent session cleanly closed.")

    app.on_cleanup.append(on_cleanup)
    return app

def run_bridge(port: int = 5055):
    print("=" * 70)
    print(f"   *** PRIMORDIAOS REALM COCKPIT BRIDGE ONLINE (Port {port}) ***   ")
    print("=" * 70)
    print(f"  Web HUD:    http://localhost:{port}/")
    print(f"  Realms API: http://localhost:{port}/api/realms")
    print(f"  Session:    primordiaos-sovereign-session-001-main")
    print("=" * 70)
    app = asyncio.run(app_factory())
    web.run_app(app, host="127.0.0.1", port=port)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 5055
    run_bridge(port)
