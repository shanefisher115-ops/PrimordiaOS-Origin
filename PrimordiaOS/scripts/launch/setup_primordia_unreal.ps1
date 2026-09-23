Write-Host "Creating PrimordiaUnreal directory structure..."

# Root folders
New-Item -ItemType Directory -Force -Path "PrimordiaUnreal"
New-Item -ItemType Directory -Force -Path "PrimordiaUnreal/WebSocket"
New-Item -ItemType Directory -Force -Path "PrimordiaUnreal/Blueprints"
New-Item -ItemType Directory -Force -Path "PrimordiaUnreal/Niagara"
New-Item -ItemType Directory -Force -Path "PrimordiaUnreal/Events"
New-Item -ItemType Directory -Force -Path "PrimordiaUnreal/WorldCommands"

# Event JSON files
New-Item -ItemType File -Force -Path "PrimordiaUnreal/Events/primordia_events.json"
New-Item -ItemType File -Force -Path "PrimordiaUnreal/Events/agent_state.json"
New-Item -ItemType File -Force -Path "PrimordiaUnreal/Events/metric_stream.json"
New-Item -ItemType File -Force -Path "PrimordiaUnreal/Events/pulse_update.json"
New-Item -ItemType File -Force -Path "PrimordiaUnreal/Events/evolution_patch.json"

# World commands JSON
@'
{
  "commands": [
    { "name": "SpawnPulse", "intensity": 1.0 },
    { "name": "SpawnAgent", "energy": 0.8 },
    { "name": "TriggerShockwave", "radius": 5.0 }
  ]
}
'@ | Set-Content "PrimordiaUnreal/WorldCommands/world_commands.json"

# WebSocket schema
@'
export interface PrimordiaEvent {
  type: string;
  timestamp: number;
  payload: any;
}
'@ | Set-Content "PrimordiaUnreal/WebSocket/primordia_event_schema.ts"

# Niagara parameter map
@'
AgentEnergy → float
PulseWave → float
MetricStream → float
EvolutionBurst → float
PostShockwave → float
'@ | Set-Content "PrimordiaUnreal/Niagara/niagara_parameter_map.txt"

# Blueprint plan
@'
# Blueprint Engine Controller Plan

- Event BeginPlay
- Create WebSocket connection
- OnMessage → Parse JSON
- Switch on "type"
- Set Niagara parameters
- Trigger particle bursts
- Trigger world commands
'@ | Set-Content "PrimordiaUnreal/Blueprints/BP_EngineController_plan.md"

# Overlay folders
New-Item -ItemType Directory -Force -Path "PrimordiaOverlay"
New-Item -ItemType Directory -Force -Path "PrimordiaOverlay/components"
New-Item -ItemType Directory -Force -Path "PrimordiaOverlay/webgpu"
New-Item -ItemType Directory -Force -Path "PrimordiaOverlay/hud"

# Overlay component
@'
export default function PulseHUD({ pulse }) {
  return (
    <div className="pulse-hud">
      <span>PULSE: {pulse}</span>
    </div>
  );
}
'@ | Set-Content "PrimordiaOverlay/components/PulseHUD.tsx"

# Control room layout
@'
# Cosmic Control Room Layout

- Central nebula
- Agent orbit rings
- Metric streams
- Evolution fractal wall
- Shockwave horizon
- VR interaction nodes
'@ | Set-Content "PrimordiaOverlay/control_room_layout.md"

# Pixel Streaming server
New-Item -ItemType Directory -Force -Path "PixelStreamServer"
New-Item -ItemType File -Force -Path "PixelStreamServer/start_server.ps1"
New-Item -ItemType File -Force -Path "PixelStreamServer/config.json"

Write-Host "PrimordiaUnreal setup complete."
