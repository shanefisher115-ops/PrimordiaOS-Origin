---
name: PrimordialKernelConnector
description: Expose and call the PrimordialOS HTTP kernel to run commands like seeding the content engine, querying stream status, or restarting live agents.
---

# PrimordialKernelConnector

This skill allows Antigravity to interface directly with the PrimordialOS HTTP Kernel API.

## Tools & Helper Scripts

- **Python Client**: [call_kernel.py](file:///c:/Users/Shane/Documents/PowerShell/Modules/PrimordialOS/.agents/skills/PrimordialKernelConnector/scripts/call_kernel.py)
  Run this zero-dependency Python script to dispatch commands to the kernel:
  ```bash
  python .agents/skills/PrimordialKernelConnector/scripts/call_kernel.py <command> [payload_json]
  ```

## API Specifications

- **Endpoint**: `POST http://localhost:8080/kernel/command`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Primordial-Key: <your_api_key>` (defaults to `primordial_antigravity_key_123` if not specified)
- **Request Body**:
  ```json
  {
    "command": "seed_content_engine" | "stream_status" | "restart_agent",
    "payload": {}
  }
  ```

## Supported Commands

1. `seed_content_engine`: Orchestrates seeding of evergreen scripts and anchor blog outlines.
2. `stream_status`: Fetches connection state, active user, autopilot flags, and queue length.
3. `restart_agent`: Reconnects specified streaming sub-agents (e.g. `{"name": "TikTokAgent"}`).
