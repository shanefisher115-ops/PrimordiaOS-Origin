from google.adk import tool, Agent
from vertexai.agent_engines import AdkApp
from google.genai import types

# -------------------------
# Tools
# -------------------------

@tool
def read_world_state():
    return {"danger": 3}

@tool
def compute_risk(state: dict):
    return {"risk": state["danger"] * 2}

@tool
def send_pulse(value: int):
    print(f"[PrimordiaOS] Pulse:", value)
    return {"status": "ok"}

# -------------------------
# Agent
# -------------------------

agent = Agent(
    name="PrimordiaCore",
    model="gemini-2.0-flash",
    tools=[read_world_state, compute_risk, send_pulse],
    generate_content_config=types.GenerateContentConfig(
        temperature=0.2,
        max_output_tokens=500,
    ),
)

app = AdkApp(agent=agent)

# -------------------------
# Run agent
# -------------------------

async def run():
    async for event in app.async_stream_query(
        user_id="shane",
        message="Run a pulse cycle.",
    ):
        print(event)
