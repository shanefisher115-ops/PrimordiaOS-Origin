import sys
import json
import asyncio
import base64
from temporalio.client import Client

WORKFLOW = "UnifiedIntentRouter"

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "no_base64"}))
        return

    # Base64 payload from PowerShell
    b64 = sys.argv[1]

    try:
        decoded = base64.b64decode(b64).decode("utf-8")
    except Exception:
        print(json.dumps({"error": "base64_decode_failed"}))
        return

    try:
        event = json.loads(decoded)
    except Exception:
        print(json.dumps({"error": "invalid_json"}))
        return

    # Connect to Temporal
    client = await Client.connect("localhost:7233")

    # Execute Unified Intent Router workflow
    result = await client.execute_workflow(
        WORKFLOW,
        event,
        id="primordia-router-cli",
        task_queue="primordia"
    )

    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())
