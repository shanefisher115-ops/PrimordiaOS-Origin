import urllib.request
import json
import sys
import os

def call_primordial_kernel(command, payload=None, api_key=None, url=None):
    if not url:
        url = os.environ.get("PRIMORDIAL_KERNEL_URL", "http://localhost:8080/kernel/command")
    if not api_key:
        api_key = os.environ.get("PRIMORDIAL_API_KEY", "primordial_antigravity_key_123")
    
    headers = {
        "Content-Type": "application/json",
        "X-Primordial-Key": api_key
    }
    
    req_body = {
        "command": command,
        "payload": payload or {}
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(req_body).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except Exception as e:
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: call_kernel.py <command> [payload_json]")
        sys.exit(1)
        
    cmd = sys.argv[1]
    payload = {}
    if len(sys.argv) > 2:
        try:
            payload = json.loads(sys.argv[2])
        except Exception as e:
            print(f"Error parsing payload JSON: {e}")
            sys.exit(1)
            
    res = call_primordial_kernel(cmd, payload)
    print(json.dumps(res, indent=2))
