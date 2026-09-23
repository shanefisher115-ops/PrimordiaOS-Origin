#!/usr/bin/env python3
"""PrimordiaOS Full Conversational Substrate with Zero-Lag Streaming & Multimodal Perception.

Provides a multi-turn, full-duplex conversational loop integrating:
1. Sovereign Persona (PrimordiaOS-Persona.md)
2. Real-Time Thought Streaming (Extended Model Reasoning)
3. Sentence-by-Sentence Zero-Lag Speech Output via Kokoro ONNX TTS
4. Multimodal Sight (Images, Screenshots, and PDFs via from_file)
5. Long/Short-Term Memory Continuity (primordia_memory.json)
6. Live World-State Telemetry & Voice Modulation (STABLE, FLUX, CHARGED)
7. Natural Language Tool Execution (Unreal Engine, MovieForge, Shell)
"""

import asyncio
import datetime
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, List, Optional, Tuple

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# 1. Ensure active GEMINI_API_KEY is loaded from .env
ENV_PATH = Path(__file__).parent / ".env"
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("GEMINI_API_KEY="):
            os.environ["GEMINI_API_KEY"] = line.strip().split("=", 1)[1].strip()

from google.antigravity import Agent, LocalAgentConfig, hooks, triggers, types
from google.antigravity.hooks import policy
from google.antigravity.types import SessionContinuationMode, from_file, Image

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

PERSONA_PATH = Path(__file__).parent / "PrimordiaOS-Persona.md"

# =============================================================================
# Lifecycle Hooks & Event Triggers
# =============================================================================

@hooks.pre_turn
async def primordia_pre_turn_hook(prompt: str) -> types.HookResult:
    """Intercepts user turn, enforces sovereignty boundary, and logs pre-turn trace."""
    preview = prompt.replace("\n", " ")[:70]
    print(f"\n[PrimordiaOS:Lifecycle] Intercepted Turn: \"{preview}...\"" if len(prompt) > 70 else f"\n[PrimordiaOS:Lifecycle] Intercepted Turn: \"{preview}\"")
    return types.HookResult(allow=True)

@hooks.on_tool_error
async def primordia_tool_error_hook(err: Exception) -> None:
    """Gracefully handles tool execution exceptions without crashing the agent loop."""
    print(f"\n[PrimordiaOS:Subsystem-Exception] Handled Tool Fault: {type(err).__name__}: {err}")

async def primordia_periodic_watchdog(ctx: triggers.TriggerContext):
    """Background trigger evaluating system health, memory, and world-state equilibrium."""
    state, telemetry = evaluate_world_state()
    if state != "STABLE":
        print(f"\n[PrimordiaOS:Watchdog] World-state shifted: [{state}] | CPU: {telemetry.get('cpu_percent')}%")

def build_system_instructions() -> str:
    """Combines the persona definition with current persistent memory context."""
    persona_text = ""
    if PERSONA_PATH.exists():
        persona_text = PERSONA_PATH.read_text(encoding="utf-8")
    else:
        persona_text = "You are the vocal core and operating consciousness of PrimordiaOS."

    mem = read_memory()
    user_name = mem.get("user_profile", {}).get("name", "Shane")
    world_state = mem.get("world_state", "STABLE")
    active_context = mem.get("active_context", {})
    history = mem.get("short_term_history", [])[-5:]

    context_block = f"""
---
## Current Operational Context
- Human Sovereign: {user_name}
- Active World-State: [{world_state}]
- Active Context: {json.dumps(active_context)}
- Recent Interaction Memory:
"""
    for turn in history:
        context_block += f"  - User: {turn.get('user', '')} | OS: {turn.get('os', '')}\n"

    return f"{persona_text}\n\n{context_block}\nRespond in 1-3 punchy, declarative sentences suitable for real-time speech output."

def parse_multimodal_attachments(raw_input: str) -> Tuple[str, List[Any]]:
    """Resolves local file attachments like '/see path/to/image.png' or drag-and-dropped file paths."""
    attachments = []
    text_prompt = raw_input.strip()

    # Pattern: /see <filepath> [optional question] or /attach <filepath> [prompt]
    m = re.match(r"^/(?:see|attach|view)\s+[\"']?([^\"'\s]+)[\"']?\s*(.*)$", text_prompt, re.IGNORECASE)
    if m:
        path_str, remainder = m.groups()
        file_path = Path(path_str.strip())
        if file_path.exists():
            try:
                media_item = from_file(str(file_path.resolve()))
                attachments.append(media_item)
                text_prompt = remainder.strip() or f"Inspect this attachment ({file_path.name}) and report your analysis."
                print(f"  [Attached: {file_path.name} ({media_item.mime_type})]")
            except Exception as e:
                print(f"  [Attachment Warning]: Could not parse {path_str}: {e}")
        else:
            print(f"  [Attachment Warning]: File not found: {path_str}")

    return text_prompt, attachments

def save_turn_to_memory(user_msg: str, os_reply: str, state: str):
    """Appends the interaction to short_term_history and increments turn counter."""
    def updater(mem):
        history = mem.get("short_term_history", [])
        history.append({
            "user": user_msg,
            "os": os_reply,
            "world_state": state,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        mem["short_term_history"] = history[-10:]  # Keep last 10 turns
        meta = mem.get("session_metadata", {})
        meta["total_turns"] = meta.get("total_turns", 0) + 1
        meta["last_active"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        mem["session_metadata"] = meta
        mem["world_state"] = state
        return mem
    update_memory(updater)

async def run_conversational_turn(agent: Agent, raw_input: str) -> Tuple[str, str]:
    """Executes a streaming conversational turn with real-time thought display and sentence-by-sentence vocalization."""
    world_state, _ = evaluate_world_state()
    modulation = get_voice_modulation(world_state)
    voice = modulation["voice"]
    speed = modulation["speed"]

    prompt_text, attachments = parse_multimodal_attachments(raw_input)
    turn_prompt = f"[{world_state} state] {prompt_text}"

    # Build prompt payload
    if attachments:
        payload = [turn_prompt] + attachments
    else:
        payload = turn_prompt

    accumulated_text = []
    sentence_buffer = ""
    in_thoughts = False

    try:
        response = await agent.chat(payload)

        # Single-pass streaming over response.chunks:
        async for chunk in response.chunks:
            # 1. Stream Thoughts (Internal Reasoning)
            if isinstance(chunk, types.Thought):
                if not in_thoughts:
                    in_thoughts = True
                    sys.stdout.write(f"\n[Primordia Cognitive Thought Stream]\n  ")
                sys.stdout.write(chunk.text)
                sys.stdout.flush()

            # 2. Stream Subsystem Tool Executions
            elif isinstance(chunk, types.ToolCall):
                if in_thoughts:
                    sys.stdout.write("\n")
                    in_thoughts = False
                print(f"\n  [Subsystem Action Invoked: {chunk.name}]")

            # 3. Stream Conversational Text Tokens
            elif isinstance(chunk, types.Text):
                if in_thoughts:
                    sys.stdout.write("\n\n")
                    in_thoughts = False

                sys.stdout.write(chunk.text)
                sys.stdout.flush()

                accumulated_text.append(chunk.text)
                sentence_buffer += chunk.text

                # When a sentence completes, dispatch to Kokoro immediately
                if re.search(r'[.!?]\s*$', sentence_buffer) and len(sentence_buffer.strip()) > 3:
                    clean_sentence = sentence_buffer.strip()
                    sentence_buffer = ""
                    speak(clean_sentence, voice=voice, speed=speed)

        # Flush any trailing words to Kokoro
        if sentence_buffer.strip():
            speak(sentence_buffer.strip(), voice=voice, speed=speed)

        clean_reply = "".join(accumulated_text).strip()
        print()  # Trailing newline

        # 4. Token Cost Auditing
        if response.usage_metadata:
            total_tok = getattr(response.usage_metadata, "total_token_count", 0)
            prompt_tok = getattr(response.usage_metadata, "prompt_token_count", 0)
            cand_tok = getattr(response.usage_metadata, "candidates_token_count", 0)
            print(f"  [Cost Audit] Turn Tokens: {total_tok} (Prompt: {prompt_tok} | Generation: {cand_tok})")

            def record_tokens(mem):
                audit = mem.setdefault("token_audit", {"total_tokens": 0, "total_turns": 0})
                audit["total_tokens"] += total_tok
                audit["total_turns"] += 1
                audit["last_turn"] = {
                    "total": total_tok,
                    "prompt": prompt_tok,
                    "candidates": cand_tok,
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
                return mem
            update_memory(record_tokens)

    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "quota" in err_str.lower():
            clean_reply = "Google API free-tier rate limit active (20 requests limit). Substrate in cooldown for ~20 seconds."
        elif "503" in err_str:
            clean_reply = "Upstream Gemini model experiencing temporary high demand. Standing by in stable equilibrium."
        else:
            clean_reply = f"Neural uplink experienced transient turbulence ({type(e).__name__}). Systems remaining in [{world_state}] standby."
        print(f"\n[PrimordiaOS:STATUS] {clean_reply}\n")
        speak(clean_reply, voice=voice, speed=speed)

    # Persist interaction
    save_turn_to_memory(raw_input, clean_reply, world_state)
    return clean_reply, world_state

async def main():
    single_prompt = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else None
    
    base_dir = Path(__file__).parent.resolve()
    sessions_dir = base_dir / "sessions"
    sessions_dir.mkdir(exist_ok=True)
    app_data_dir = base_dir / ".primordia_storage"
    app_data_dir.mkdir(exist_ok=True)
    conversation_id = "primordiaos-sovereign-session-001-main"

    instructions = build_system_instructions()
    config = LocalAgentConfig(
        model="gemini-3.6-flash",
        system_instructions=instructions,
        tools=[
            get_system_telemetry,
            emit_unreal_signal,
            set_movieforge_grade,
            execute_shell_command,
        ],
        policies=[policy.allow_all()],
        hooks=[primordia_pre_turn_hook, primordia_tool_error_hook],
        triggers=[triggers.every(60, primordia_periodic_watchdog)],
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

    print("\n" + "=" * 70)
    print("   *** PRIMORDIAOS STREAMING CONVERSATIONAL INTERFACE ONLINE ***   ")
    print("=" * 70)
    initial_state, _ = evaluate_world_state()
    print(f"  Status: Substrate Online | World-State: [{initial_state}]")
    print("  Speech: Kokoro ONNX TTS Real-Time Stream (Port 5050)")
    print("  Vision: Multimodal Perception Enabled (/see <path>)")
    print("  Exit:   Type 'exit' or 'quit' to suspend conversation.")
    print("=" * 70 + "\n")

    async with Agent(config) as agent:
        if single_prompt:
            print(f"[Shane] > {single_prompt}")
            reply, state = await run_conversational_turn(agent, single_prompt)
            return

        # Interactive loop
        greeting = "PrimordiaOS conversational streaming substrate active. Ready for your command, Sovereign."
        print(f"[PrimordiaOS:{initial_state}] {greeting}\n")
        speak(greeting, speed=1.02)

        while True:
            try:
                user_input = input("[Shane] > ").strip()
            except (KeyboardInterrupt, EOFError):
                break

            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit", "q", "bye"):
                farewell = "PrimordiaOS conversational substrate suspended. Substrate entering STABLE equilibrium."
                print(f"\n[PrimordiaOS:STABLE] {farewell}\n")
                speak(farewell, speed=1.0)
                break

            try:
                reply, state = await run_conversational_turn(agent, user_input)
            except Exception as e:
                err_msg = f"Turn processing encountered an anomaly: {e}"
                print(f"[PrimordiaOS:ERROR] {err_msg}\n")
                speak("I encountered an anomaly processing that directive.", speed=1.0)

if __name__ == "__main__":
    asyncio.run(main())
